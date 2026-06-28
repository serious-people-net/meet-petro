#!/usr/bin/env bash
# One-time, idempotent setup for the Petro exhibit Pi.
#
# Target: Raspberry Pi OS Lite (Debian 13 trixie, 64-bit), headless — no
# desktop. We install a Wayland kiosk stack (cage) rather than a full desktop.
#
# Run as the normal user (it uses sudo internally for the privileged bits):
#   ~/meet-petro/scripts/pi-setup.sh
#
# Safe to re-run: skips work that's already done.
set -euo pipefail

REPO_URL="https://github.com/serious-people-net/meet-petro"
REPO="${PETRO_REPO:-$HOME/meet-petro}"
USER_NAME="$(whoami)"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== Petro Pi setup (user: $USER_NAME) =="

echo "-- apt packages --"
sudo apt update
# cage:      Wayland kiosk compositor (runs one fullscreen app, the browser)
# chromium:  the browser the app runs in
# python3-flask: serves dist/ and handles /api/print  (single process)
# cups:      printing (Canon TS7451a via driverless IPP Everywhere)
# avahi-utils: avahi-browse, used to discover the printer on the Direct AP
# seatd:     seat manager so cage can reach the GPU/input (libseat fallback)
# git/curl:  fetch + build the app
sudo apt install -y cage chromium python3-flask cups avahi-utils git curl seatd

echo "-- Node 22 (NodeSource) --"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "node $(node -v), npm $(npm -v)"

echo "-- seatd + group membership --"
sudo systemctl enable --now seatd
# The seatd socket is group-owned; user must be in that group to use it.
SEAT_GROUP="$(getent group _seatd >/dev/null && echo _seatd || echo seat)"
sudo usermod -aG "$SEAT_GROUP" "$USER_NAME" || true
# video/render/input are usually already granted on Pi OS; ensure anyway.
sudo usermod -aG video,render,input "$USER_NAME" || true

echo "-- repo at $REPO --"
if [ -d "$REPO/.git" ]; then
  git -C "$REPO" pull --ff-only || echo "(pull skipped/failed; continuing)"
else
  git clone "$REPO_URL" "$REPO"
fi

echo "-- transparent kiosk cursor theme --"
# Restores the 'Hidden' xcursor theme that XCURSOR_THEME=Hidden depends on.
chmod +x "$HERE/install-hidden-cursor.sh"
"$HERE/install-hidden-cursor.sh"

echo "-- printer WiFi Direct profile --"
# Recreates the 'printer-direct' NM profile the admin panel switches to.
chmod +x "$HERE/install-printer-wifi.sh"
sudo -E "$HERE/install-printer-wifi.sh" || echo "(printer-wifi profile setup skipped/failed; continuing)"

echo "-- wifi-switch.sh permissions --"
chmod +x "$HERE/wifi-switch.sh"
SUDOERS_FILE=/etc/sudoers.d/020-petro-wifi
if [ ! -f "$SUDOERS_FILE" ]; then
  echo "$USER_NAME ALL=(root) NOPASSWD: $REPO/scripts/wifi-switch.sh" \
    | sudo tee "$SUDOERS_FILE" > /dev/null
  sudo chmod 0440 "$SUDOERS_FILE"
  echo "  sudoers rule installed — Flask can now switch WiFi networks"
else
  echo "  sudoers rule already present"
fi

echo "-- systemd unit (installed, NOT enabled — no autostart yet) --"
sudo cp "$HERE/petro-kiosk.service" /etc/systemd/system/petro-kiosk.service
sudo sed -i "s|__USER__|$USER_NAME|g; s|__REPO__|$REPO|g" \
  /etc/systemd/system/petro-kiosk.service
sudo systemctl daemon-reload

cat <<EOF

== Done ==
Test the kiosk (does NOT survive reboot until you 'enable' it):

  sudo systemctl start petro-kiosk     # bring Petro up on the round panel
  journalctl -u petro-kiosk -f         # watch logs
  sudo systemctl stop  petro-kiosk     # take it down (escape hatch)

Turn on autostart-at-boot later, once you're happy:

  sudo systemctl enable petro-kiosk
EOF
