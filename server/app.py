"""Petro server.

Serves the built frontend (../dist) and handles print requests, so a
single process runs on the Pi. The print matrix lives in the frontend
build (dist/printouts/matrix.json) — one source of truth shared with
the web app.

Run:    python app.py            (port 8080)
Print:  POST /api/print  {"audience": "divorced-men", "emotion": "fear"}
"""

import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

DIST = Path(__file__).resolve().parent.parent / "dist"
PRINTOUTS = DIST / "printouts"

# Printer name as known to CUPS (`lpstat -p` to list). None = system default.
# Update this once the exhibit printer model is known.
PRINTER_NAME = "petroprinter"

# Back cover printed on the reverse of every idea sheet.
# DUPLEX=True prints it in one duplex job — but the Canon reduces ink
# density on duplex (firmware behaviour, not overridable via CUPS), so the
# workflow instead is: print a batch of back pages via /api/print-back
# (admin panel), flip the stack, reload the tray.
BACK_COVER = "BACK-PETRO.pdf"
DUPLEX = False

# lp options. PPD-style names — IPP-style equivalents were silently ignored
# by this printer (e.g. sides= had no effect; Duplex= works).
PRINT_OPTIONS = [
    "-o", "PageSize=A5",
    "-o", "InputSlot=Rear",
    "-o", "ColorModel=Gray",
    "-o", "cupsPrintQuality=High",
    "-o", "print-scaling=fill",
    # "-o", "Duplex=DuplexNoTumble",  # re-enable with DUPLEX=True
]

app = Flask(__name__)

WIFI_SWITCH = Path(__file__).resolve().parent.parent / 'scripts' / 'wifi-switch.sh'


def _wlan_ip() -> str | None:
    try:
        r = subprocess.run(['ip', '-4', 'addr', 'show', 'wlan0'],
                           capture_output=True, text=True, timeout=5)
        m = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', r.stdout)
        return m.group(1) if m else None
    except Exception:
        return None


def _active_ssid() -> str | None:
    try:
        r = subprocess.run(['nmcli', '-t', '-f', 'ACTIVE,SSID', 'dev', 'wifi'],
                           capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            if line.startswith('yes:'):
                return line[4:]
        return None
    except Exception:
        return None


@app.get('/api/network')
def network_status():
    return jsonify({'ip': _wlan_ip(), 'ssid': _active_ssid()})


BLUETOOTH_CONNECT = Path(__file__).resolve().parent.parent / 'scripts' / 'bluetooth-connect.sh'
BLUETOOTH_SPEAKER_NAME = 'WONDERBOOM'


def _bt_paired_mac(name: str) -> str | None:
    try:
        r = subprocess.run(['bluetoothctl', 'devices', 'Paired'],
                           capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            if name.lower() in line.lower():
                parts = line.split()
                return parts[1] if len(parts) > 1 else None
        return None
    except Exception:
        return None


def _bt_connected(mac: str) -> bool:
    try:
        r = subprocess.run(['bluetoothctl', 'info', mac],
                           capture_output=True, text=True, timeout=5)
        return 'Connected: yes' in r.stdout
    except Exception:
        return False


def _default_sink() -> str | None:
    try:
        r = subprocess.run(['pactl', 'info'], capture_output=True, text=True, timeout=5)
        m = re.search(r'Default Sink: (\S+)', r.stdout)
        return m.group(1) if m else None
    except Exception:
        return None


def _builtin_sink() -> str | None:
    try:
        r = subprocess.run(['pactl', 'list', 'short', 'sinks'],
                           capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            cols = line.split()
            if len(cols) > 1 and not cols[1].startswith('bluez_sink.'):
                return cols[1]
        return None
    except Exception:
        return None


@app.get('/api/bluetooth/status')
def bluetooth_status():
    mac = _bt_paired_mac(BLUETOOTH_SPEAKER_NAME)
    connected = _bt_connected(mac) if mac else False
    default_sink = _default_sink()
    using_speaker = bool(default_sink) and default_sink.startswith('bluez_sink.')
    return jsonify({'paired': mac is not None, 'connected': connected, 'usingSpeaker': using_speaker})


@app.post('/api/bluetooth/connect')
def bluetooth_connect():
    if not BLUETOOTH_CONNECT.exists():
        return jsonify({'ok': False, 'error': 'bluetooth-connect.sh not found'}), 501
    subprocess.Popen([str(BLUETOOTH_CONNECT), BLUETOOTH_SPEAKER_NAME],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({'ok': True})


@app.post('/api/bluetooth/builtin')
def bluetooth_use_builtin():
    sink = _builtin_sink()
    if not sink:
        return jsonify({'ok': False, 'error': 'no built-in sink found'}), 501
    try:
        subprocess.run(['pactl', 'set-default-sink', sink],
                       check=True, capture_output=True, text=True, timeout=5)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        return jsonify({'ok': False, 'error': str(exc)}), 500
    return jsonify({'ok': True, 'sink': sink})


@app.post('/api/network')
def network_switch():
    data = request.get_json(silent=True) or {}
    mode = data.get('mode', '')
    if mode not in ('printer', 'maintenance'):
        return jsonify({'ok': False, 'error': 'mode must be printer or maintenance'}), 400
    if not WIFI_SWITCH.exists():
        return jsonify({'ok': False, 'error': 'wifi-switch.sh not found'}), 501
    subprocess.Popen(['sudo', str(WIFI_SWITCH), mode],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({'ok': True, 'mode': mode})


@app.post('/api/admin/stop')
def admin_stop():
    if not WIFI_SWITCH.exists():
        return jsonify({'ok': False, 'error': 'wifi-switch.sh not found'}), 501
    subprocess.Popen(['sudo', str(WIFI_SWITCH), 'stop'],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({'ok': True})


@app.post('/api/admin/restart')
def admin_restart():
    if not WIFI_SWITCH.exists():
        return jsonify({'ok': False, 'error': 'wifi-switch.sh not found'}), 501
    subprocess.Popen(['sudo', str(WIFI_SWITCH), 'restart'],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({'ok': True})


@app.post('/api/admin/shutdown')
def admin_shutdown():
    if not WIFI_SWITCH.exists():
        return jsonify({'ok': False, 'error': 'wifi-switch.sh not found'}), 501
    subprocess.Popen(['sudo', str(WIFI_SWITCH), 'shutdown'],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({'ok': True})


@app.post('/api/admin/reboot')
def admin_reboot():
    if not WIFI_SWITCH.exists():
        return jsonify({'ok': False, 'error': 'wifi-switch.sh not found'}), 501
    subprocess.Popen(['sudo', str(WIFI_SWITCH), 'reboot'],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return jsonify({'ok': True})


def load_matrix() -> dict:
    with open(PRINTOUTS / "matrix.json") as f:
        return json.load(f)


def printout_for(audience: str, emotion: str) -> Path:
    matrix = load_matrix()
    filename = matrix.get(f"{audience}.{emotion}") or matrix.get("default")
    if not filename:
        raise KeyError("no printout mapped and no default set")
    return PRINTOUTS / filename


@app.post("/api/print")
def print_idea():
    data = request.get_json(silent=True) or {}
    audience = data.get("audience", "")
    emotion = data.get("emotion", "")
    try:
        front_path = printout_for(audience, emotion)
    except (KeyError, FileNotFoundError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 404

    if DUPLEX:
        # Combine front + back cover into a 2-page PDF and print duplex.
        # Re-enable by setting DUPLEX=True and uncommenting Duplex= in PRINT_OPTIONS.
        # Note: Canon TS7451a reduces ink density on duplex (firmware behaviour,
        # not overridable via CUPS), so quality is noticeably lower.
        back_path = PRINTOUTS / BACK_COVER
        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tmp_path = tmp.name
        tmp.close()
        try:
            subprocess.run(
                ["convert", "-density", "300", "-compress", "lossless",
                 str(front_path), str(back_path), tmp_path],
                check=True, capture_output=True, text=True, timeout=30,
            )
            cmd = ["lp"]
            if PRINTER_NAME:
                cmd += ["-d", PRINTER_NAME]
            cmd += PRINT_OPTIONS
            cmd.append(tmp_path)
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=10)
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            app.logger.error("print failed: %s\nstdout: %s\nstderr: %s",
                             exc, getattr(exc, "stdout", ""), getattr(exc, "stderr", ""))
            return jsonify({"ok": False, "error": "print command failed"}), 500
        finally:
            os.unlink(tmp_path)
    else:
        # Single-sided: print the front poster directly.
        try:
            cmd = ["lp"]
            if PRINTER_NAME:
                cmd += ["-d", PRINTER_NAME]
            cmd += PRINT_OPTIONS
            cmd.append(str(front_path))
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=10)
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            app.logger.error("print failed: %s\nstdout: %s\nstderr: %s",
                             exc, getattr(exc, "stdout", ""), getattr(exc, "stderr", ""))
            return jsonify({"ok": False, "error": "print command failed"}), 500

    return jsonify({"ok": True, "file": front_path.name})


@app.post("/api/print-back")
def print_back():
    """Print N copies of the back cover single-sided, so a stack can be
    flipped and reloaded into the tray (full ink density, unlike duplex)."""
    data = request.get_json(silent=True) or {}
    try:
        count = int(data.get("count", 1))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "count must be a number"}), 400
    count = max(1, min(50, count))
    back_path = PRINTOUTS / BACK_COVER
    if not back_path.exists():
        return jsonify({"ok": False, "error": f"{BACK_COVER} not found"}), 404
    try:
        cmd = ["lp"]
        if PRINTER_NAME:
            cmd += ["-d", PRINTER_NAME]
        cmd += ["-n", str(count)]
        cmd += PRINT_OPTIONS
        cmd.append(str(back_path))
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=10)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        app.logger.error("back-page print failed: %s\nstdout: %s\nstderr: %s",
                         exc, getattr(exc, "stdout", ""), getattr(exc, "stderr", ""))
        return jsonify({"ok": False, "error": "print command failed"}), 500
    return jsonify({"ok": True, "count": count})


@app.get("/")
def index():
    return send_from_directory(DIST, "index.html")


@app.get("/<path:path>")
def assets(path: str):
    # Directory requests (e.g. /app/) get their index.html, like a static host
    if (DIST / path).is_dir():
        return send_from_directory(DIST, f"{path.rstrip('/')}/index.html")
    return send_from_directory(DIST, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
