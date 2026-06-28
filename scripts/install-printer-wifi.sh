#!/usr/bin/env bash
# Create the NetworkManager profile for the printer's WiFi Direct AP.
#
# Why: wifi-switch.sh (the in-app maintenance toggle) does `nmcli con up
# printer-direct`. That profile is venue-specific system state, not part of the
# repo, so it does not survive an SD reimage — without it the admin panel's
# "switch to printer network" silently fails. This recreates it from the
# documented Canon WiFi Direct credentials. Run via sudo. Idempotent.
#
# Override the defaults from the printer's screen (Settings -> LAN settings ->
# Wireless Direct -> Show settings) if they ever change:
#   PRINTER_SSID="DIRECT-xxxx-TS7451a" PRINTER_PSK="..." sudo -E install-printer-wifi.sh
set -euo pipefail

SSID="${PRINTER_SSID:-DIRECT-4Vpetro}"
PSK="${PRINTER_PSK:-meetpetro1}"
CON="printer-direct"

if nmcli -t -f NAME con show | grep -qx "$CON"; then
  echo "install-printer-wifi: '$CON' already exists — refreshing SSID/PSK"
  nmcli con modify "$CON" \
    802-11-wireless.ssid "$SSID" \
    802-11-wireless-security.key-mgmt wpa-psk \
    802-11-wireless-security.psk "$PSK" \
    connection.autoconnect yes connection.autoconnect-priority 100
else
  nmcli con add type wifi con-name "$CON" \
    ssid "$SSID" \
    wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PSK" \
    connection.autoconnect yes connection.autoconnect-priority 100
  echo "install-printer-wifi: created '$CON' (ssid $SSID)"
fi

echo "install-printer-wifi: done — 'wifi-switch.sh printer' will now work"
