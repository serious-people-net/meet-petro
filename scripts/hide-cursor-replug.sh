#!/usr/bin/env bash
# Hide the kiosk cursor by software-replugging the WaveShare touch panel.
#
# Why: the WaveShare round panel enumerates as an absolute pointer (mouse0), so
# wlroots/cage parks a cursor at screen centre on startup. cage only hides it
# (via the transparent XCURSOR_THEME=Hidden theme set in pi-kiosk.sh) once a
# pointer device is (re)attached — which is why physically unplugging/replugging
# the panel makes the cursor disappear. This reproduces that re-attach in software
# by toggling the USB device's `authorized` flag, so it happens automatically at
# boot and the cursor stays hidden for the whole session.
#
# Run as root — wired in via the systemd unit's `ExecStartPost=+` (the `+` runs it
# with full privileges even though the service itself runs as the kiosk user).
# Safe no-op if the panel isn't found, so it never blocks the kiosk from starting.
set -uo pipefail

VID=0712   # WaveShare touch panel USB vendor:product (see `lsusb`)
PID=000a

# The re-attach must be the *last* thing that touches the cursor, otherwise it is
# undone. So wait for cage AND chromium, then let chromium finish loading — it
# does its own initial pointer/cursor setup as it starts, and a replug fired
# before that just gets overwritten (this is why a +4s boot-time replug failed but
# a manual one on a settled session stuck).
for _ in $(seq 1 60); do pgrep -x cage      >/dev/null 2>&1 && break; sleep 0.5; done
for _ in $(seq 1 60); do pgrep -f chromium  >/dev/null 2>&1 && break; sleep 0.5; done
sleep 6   # let chromium finish its initial load + cursor setup

# Resolve the panel by vendor:product — the USB port path (e.g. 1-1) can change.
dev=""
for d in /sys/bus/usb/devices/*/; do
  [ -f "$d/idVendor" ] && [ -f "$d/idProduct" ] || continue
  if [ "$(cat "$d/idVendor")" = "$VID" ] && [ "$(cat "$d/idProduct")" = "$PID" ]; then
    dev="$d"; break
  fi
done

if [ -z "$dev" ] || [ ! -w "$dev/authorized" ]; then
  echo "hide-cursor-replug: WaveShare ($VID:$PID) not found — skipping" >&2
  exit 0
fi

# Replug, then replug once more after a short gap, so the re-attach is reliably
# the final cursor event even if chromium sets the cursor again late.
replug() { echo 0 > "$dev/authorized"; sleep 1; echo 1 > "$dev/authorized"; }
echo "hide-cursor-replug: software-replugging $dev to hide cursor (pass 1)"
replug
sleep 4
echo "hide-cursor-replug: software-replugging $dev to hide cursor (pass 2)"
replug
echo "hide-cursor-replug: done"
exit 0
