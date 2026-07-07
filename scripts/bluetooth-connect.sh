#!/usr/bin/env bash
# Connect the exhibit's Bluetooth speaker (UE Wonderboom) and make it the
# audio output. Run by hand over SSH (or via the admin panel's "Connect
# speaker" button, which shells out to this script) — nothing here runs
# automatically at boot, so the kiosk stays on its default HDMI output unless
# someone deliberately opts in.
#
# First run: put the Wonderboom into pairing mode (hold its Bluetooth button
# until it flashes/chimes) before running this — it needs to be discoverable
# to pair. Later runs just reconnect a device that's already paired/trusted,
# so pairing mode isn't needed again.
#
# Usage: bluetooth-connect.sh [device-name-substring]   (default: WONDERBOOM)
set -euo pipefail

NAME="${1:-WONDERBOOM}"
UID_NUM="$(id -u)"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$UID_NUM}"
export PULSE_SERVER="${PULSE_SERVER:-unix:/run/user/$UID_NUM/pulse/native}"

bluetoothctl power on >/dev/null

mac="$(bluetoothctl devices Paired | grep -i "$NAME" | awk '{print $2}' | head -1)"

if [ -z "$mac" ]; then
  echo "bluetooth-connect: no paired device matching '$NAME' — scanning (10s, put it in pairing mode now)…"
  bluetoothctl --timeout 10 scan on >/dev/null 2>&1 || true
  mac="$(bluetoothctl devices | grep -i "$NAME" | awk '{print $2}' | head -1)"
  if [ -z "$mac" ]; then
    echo "bluetooth-connect: '$NAME' not found — is it in pairing mode and in range?" >&2
    exit 1
  fi
  echo "bluetooth-connect: found $mac — pairing…"
  bluetoothctl pair "$mac"
  bluetoothctl trust "$mac"
fi

echo "bluetooth-connect: connecting to $mac…"
bluetoothctl connect "$mac"

# Give PulseAudio a moment to register the a2dp_sink card after connect.
sink=""
for _ in $(seq 1 10); do
  sink="$(pactl list short sinks | grep "^[0-9]*[[:space:]]bluez_sink\.$(echo "$mac" | tr ':' '_')" | awk '{print $2}' | head -1)"
  [ -n "$sink" ] && break
  sleep 1
done

if [ -z "$sink" ]; then
  echo "bluetooth-connect: connected, but no PulseAudio sink appeared for it" >&2
  exit 1
fi

pactl set-default-sink "$sink"
echo "bluetooth-connect: connected — audio output set to $sink"
