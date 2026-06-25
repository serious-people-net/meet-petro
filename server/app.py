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
import subprocess
import tempfile
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

DIST = Path(__file__).resolve().parent.parent / "dist"
PRINTOUTS = DIST / "printouts"

# Printer name as known to CUPS (`lpstat -p` to list). None = system default.
# Update this once the exhibit printer model is known.
PRINTER_NAME = "petroprinter"

# Back cover printed on the reverse of every idea sheet (duplex).
# Set DUPLEX=True to re-enable once print quality on duplex is acceptable.
BACK_COVER = "BACK-COVER.png"
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
