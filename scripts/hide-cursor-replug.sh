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

# How this hides the cursor: cage draws its own compositor cursor at screen
# centre on startup and keeps drawing it until Chromium takes over the pointer
# cursor — which Chromium does as `cursor: none` (set in index.css), but ONLY on
# a pointer *enter* event that arrives AFTER the page has painted. A software
# replug of a USB input device generates exactly that enter event. So the replug
# must land *after* Chromium has finished its first paint, or Chromium's own
# initial cursor setup overwrites it and cage keeps showing the arrow.
#
# The old script fired a single replug ~6s after Chromium's process appeared.
# That was enough on a warm restart (Chromium paints almost instantly) but on a
# COLD boot Chromium is still initialising for ~10–15s, so the replug fired
# before first paint and was wasted — the cursor stayed visible. Fix: wait for
# the app to actually be served, then fire several replugs spread across the
# whole paint window so at least one reliably lands after first paint.
for _ in $(seq 1 120); do pgrep -x cage     >/dev/null 2>&1 && break; sleep 0.5; done
for _ in $(seq 1 120); do pgrep -f chromium >/dev/null 2>&1 && break; sleep 0.5; done
# Wait until the kiosk page is actually being served (Chromium has something to
# paint). This is the real readiness signal, not a fixed sleep.
for _ in $(seq 1 60); do
  curl -fsS "http://localhost:8080/app/" >/dev/null 2>&1 && break
  sleep 0.5
done

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

# A quick unplug/replug. Kept short (0.3s down) so touch is barely interrupted.
replug() { echo 0 > "$dev/authorized"; sleep 0.3; echo 1 > "$dev/authorized"; }

# Fire repeatedly across Chromium's cold-boot paint window (~8s → ~45s after the
# page is first served). Cheap insurance: whichever pass lands just after first
# paint is the one that sticks, and later passes are harmless no-ops.
for delay in 8 8 10 12; do
  sleep "$delay"
  echo "hide-cursor-replug: software-replugging $dev to hide cursor"
  replug
done
echo "hide-cursor-replug: done"
exit 0
