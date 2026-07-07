#!/usr/bin/env bash
# Create the CUPS print queue the app prints to ("petroprinter").
#
# Why: server/app.py runs `lp -d petroprinter`. That queue is created with
# lpadmin and is local CUPS state, not part of the repo — so it does not survive
# an SD reimage, and without it every print silently fails. This recreates it.
#
# Must be run while the Pi is on the printer's network (the Canon WiFi Direct AP),
# because it discovers the printer's current IP via mDNS — that IP only exists on
# that network and can change between sessions. Run via sudo. Idempotent.
#
# Override discovery if needed:  PRINTER_IP=192.168.115.1 sudo -E install-printer-cups.sh
set -euo pipefail

QUEUE="petroprinter"
IP="${PRINTER_IP:-}"
PORT="${PRINTER_PORT:-631}"
RP="${PRINTER_RP:-ipp/print}"

if [ -z "$IP" ]; then
  echo "install-printer-cups: discovering Canon printer via mDNS…"
  # Parseable, resolved avahi records: fields are ;-separated; IPv4 address is #8.
  line="$( { avahi-browse -rpt _ipp._tcp 2>/dev/null || true; } | awk -F';' \
    '$1=="=" && $3=="IPv4" && tolower($4) ~ /canon/ {print; exit}' || true)"
  if [ -n "$line" ]; then
    IP="$(echo "$line"  | awk -F';' '{print $8}')"
    PORT="$(echo "$line" | awk -F';' '{print $9}')"
    rp="$(echo "$line"   | grep -oE 'rp=[^"]*' | head -1 | cut -d= -f2- || true)"
    [ -n "$rp" ] && RP="$rp"
  fi
fi

if [ -z "$IP" ]; then
  # On the Canon WiFi Direct AP the printer *is* the gateway, and it doesn't
  # always advertise over mDNS — fall back to wlan0's default gateway. Guard on
  # being on printer-direct, so on the maintenance network we don't create a
  # bogus queue pointing at the venue router.
  active="$(nmcli -t -f NAME con show --active 2>/dev/null || true)"
  if printf '%s\n' "$active" | grep -qx printer-direct; then
    IP="$(ip route show dev wlan0 2>/dev/null | awk '/^default/ {print $3; exit}')"
    [ -n "$IP" ] && echo "install-printer-cups: mDNS empty — using wlan0 gateway $IP"
  else
    echo "install-printer-cups: not on printer-direct — skipping (no printer here)"
    exit 0
  fi
fi

if [ -z "$IP" ]; then
  echo "install-printer-cups: could not find the Canon printer." >&2
  echo "  Make sure the Pi is on the printer's WiFi Direct AP, then either" >&2
  echo "  re-run, or pass the IP:  PRINTER_IP=192.168.x.1 sudo -E $0" >&2
  exit 1
fi

URI="ipp://${IP}:${PORT}/${RP}"
echo "install-printer-cups: using $URI"

systemctl is-active --quiet cups || systemctl start cups
lpadmin -x "$QUEUE" 2>/dev/null || true
lpadmin -p "$QUEUE" -E -v "$URI" -m everywhere
cupsenable "$QUEUE"  2>/dev/null || true
cupsaccept "$QUEUE"  2>/dev/null || true

echo "install-printer-cups: queue '$QUEUE' -> $URI"
lpstat -p "$QUEUE" 2>&1 || true
echo "install-printer-cups: done"
