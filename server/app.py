"""Petro server.

Serves the built frontend (../dist) and handles print requests, so a
single process runs on the Pi. The print matrix lives in the frontend
build (dist/printouts/matrix.json) — one source of truth shared with
the web app.

Run:    python app.py            (port 8080)
Print:  POST /api/print  {"audience": "divorced-men", "emotion": "fear"}
"""

import json
import subprocess
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

DIST = Path(__file__).resolve().parent.parent / "dist"
PRINTOUTS = DIST / "printouts"

# Printer name as known to CUPS (`lpstat -p` to list). None = system default.
# Update this once the exhibit printer model is known.
PRINTER_NAME = None

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
        path = printout_for(audience, emotion)
    except (KeyError, FileNotFoundError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 404

    cmd = ["lp"]
    if PRINTER_NAME:
        cmd += ["-d", PRINTER_NAME]
    cmd.append(str(path))

    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=30)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        app.logger.error("print failed: %s", exc)
        return jsonify({"ok": False, "error": "print command failed"}), 500

    return jsonify({"ok": True, "file": path.name})


@app.get("/")
def index():
    return send_from_directory(DIST, "index.html")


@app.get("/<path:path>")
def assets(path: str):
    return send_from_directory(DIST, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
