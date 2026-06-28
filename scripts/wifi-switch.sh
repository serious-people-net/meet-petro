#!/usr/bin/env bash
# Switch the Pi between the printer's WiFi Direct AP and the maintenance network.
# Must be run as root (sudo) — the sudoers rule in PI-SETUP.md grants this.
#
# Usage: wifi-switch.sh printer|maintenance
#
# Profiles expected in NetworkManager:
#   printer-direct  — Canon's WiFi Direct AP (auto-connect, high priority)
#   maintenance     — home/venue WiFi (manual only, for SSH during development)
set -euo pipefail

MODE="${1:-}"
case "$MODE" in
  printer)
    nmcli con up printer-direct
    # The Canon Direct AP hands out a fresh IP each session, so (re)create the
    # CUPS queue against the printer we can now actually see. Non-fatal: if the
    # printer isn't up yet, the queue just isn't refreshed this time.
    HERE="$(cd "$(dirname "$0")" && pwd)"
    sleep 3
    "$HERE/install-printer-cups.sh" || echo "wifi-switch: printer queue not refreshed (printer not found yet)"
    ;;
  maintenance)
    nmcli con up "netplan-wlan0-The Internet"
    ;;
  stop)
    pkill -TERM cage 2>/dev/null || true
    systemctl stop petro-kiosk 2>/dev/null || true
    ;;
  restart)
    systemctl restart petro-kiosk 2>/dev/null || (pkill -TERM cage 2>/dev/null; sleep 1; systemctl start petro-kiosk 2>/dev/null || true)
    ;;
  *)
    echo "Usage: $0 printer|maintenance|stop|restart" >&2
    exit 1
    ;;
esac
