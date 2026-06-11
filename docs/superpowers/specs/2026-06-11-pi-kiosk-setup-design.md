# Petro Pi Kiosk Setup — Design

Date: 2026-06-11
Target: the exhibit Pi `petro` (Raspberry Pi 5, 2GB, Debian 13 trixie / Pi OS
Lite 64-bit, headless — no desktop, no X server).

## Goal

From a fresh Pi OS Lite install, bring up the Petro app fullscreen on the
1080×1080 round HDMI panel with one launch action: optionally pull + build the
latest code, serve it via Flask, and display it in Chromium kiosk mode. No
autostart yet — launched manually while we maintain/test. A clean escape path
from both the Pi keyboard and over SSH.

## Why this differs from the old PI-SETUP.md

The original doc assumed Pi OS **with desktop** (labwc/LXDE autostart) and a
DisplayPort connector (`xrandr ... DP-1`). The actual hardware is Lite
(no display server) on **HDMI** (`card1-HDMI-A-1`). So §5's autostart and the
xrandr DP modeline are superseded. We supply the display stack ourselves with
Wayland.

## Display stack: cage (Wayland)

`cage` is a wlroots kiosk compositor: it runs exactly one application
fullscreen and exits when that app exits. So `cage -- chromium --kiosk …` is
the entire graphical session — no desktop, no autostart files, no `unclutter`
(touch panel, no stray cursor). Custom display modes, if the panel's EDID
doesn't already offer 1080×1080, are forced at the KMS level via
`/boot/firmware/cmdline.txt` (`video=HDMI-A-1:1080x1080@60`), which applies
regardless of compositor — not via `xrandr`.

The hard part of headless Wayland is the **seat**: a compositor needs DRM
master (GPU) + input, which an SSH shell lacks. We solve this by launching from
a **systemd service**, which owns the seat, sets `XDG_RUNTIME_DIR`, and gives a
start/stop handle that doubles as the escape hatch. `seatd` is installed as the
libseat backend.

## Components (all committed to the repo)

### 1. `scripts/pi-setup.sh` — one-time idempotent installer
- `apt install -y cage chromium python3-flask cups git seatd`
- enable `seatd`; ensure user in `seat`/`video`/`render`/`input` (already is)
- install Node 22 via NodeSource (user asked for latest; apt's 20.19 only just
  meets Vite 8's floor)
- clone repo → `~/meet-petro` if absent (idempotent: pull if present)
- install `petro-kiosk.service` to `/etc/systemd/system/`, `daemon-reload`,
  but **do not `enable`** it (no autostart yet)

### 2. `scripts/pi-kiosk.sh` — the launch flow (run by the service; also by hand)
- `cd ~/meet-petro`
- if online: `git pull`; build (`npm ci && npm run build`) **only if** HEAD
  moved or `dist/` is missing — unchanged boot is instant, fresh code rebuilds,
  offline falls back to last good `dist/`
- start Flask (`server/app.py`, port 8080) in background; wait until it answers
- `exec cage -- chromium --kiosk --ozone-platform=wayland … \
   "http://localhost:8080/app/?app"`

### 3. `petro-kiosk.service` — systemd unit (installed, not enabled)
Runs `pi-kiosk.sh` as `olifrost` with seat + `XDG_RUNTIME_DIR` so cage grabs
the HDMI output and keyboard. `Restart=no` (land on a TTY for maintenance, per
the existing escape-hatch philosophy).

## Launch / escape

- **Launch (test):** `sudo systemctl start petro-kiosk`
- **Escape over SSH:** `ssh petro 'sudo systemctl stop petro-kiosk'` (clean) or
  `pkill -f cage` (blunt)
- **Escape on Pi keyboard:** `Ctrl+Alt+F2` → text TTY (works under KMS), log in,
  manage, `Ctrl+Alt+F1` back. cage has no custom keybindings, so VT-switch + SSH
  is the standard escape.
- **Enable autostart later:** `sudo systemctl enable petro-kiosk`

## Decisions

- NodeSource Node 22 over apt's 20.19.2 (user asked for latest Node).
- Build-only-on-change rather than every boot (fast unchanged boots, safe
  offline fallback).
- Branch `pi-kiosk-setup` for the work; merge to `main` once verified on the
  panel (the kiosk script tracks `main`).

## Verification (live on the Pi)

- `systemctl start` brings the app up fullscreen on the round panel
- keyboard arrows + enter drive the app; touch works
- both escape hatches work
- nothing important clipped by the circular panel under `?app`
