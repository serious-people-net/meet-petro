# Raspberry Pi Setup (the "petro" Pi)

Setting up the exhibit Pi from a fresh **Raspberry Pi OS Lite** install
(headless — no desktop). **Note:** the Pi reachable as `pi` from Oli's
machine is the home server — do not touch it. The exhibit Pi is `petro`.

The Pi runs the app fullscreen in **Chromium under `cage`** (a Wayland
kiosk compositor), pointed at a local **Flask** server that serves the
built frontend and handles printing. One launch action pulls + builds the
latest code (when online), serves it, and displays it.

> This replaces the older desktop/labwc-autostart + `xrandr DP-1` notes:
> the hardware is Pi OS **Lite** (no display server) on a **HDMI**
> connector, so we supply a minimal Wayland stack ourselves. Design
> rationale: `docs/superpowers/specs/2026-06-11-pi-kiosk-setup-design.md`.

## Hardware as built (June 2026)

- Raspberry Pi 5, 2GB, Debian 13 (trixie) / Pi OS Lite 64-bit
- User: `olifrost`; reachable as `ssh petro`
- Display: **HDMI** (`card1-HDMI-A-1`), 1080×1080 round panel
- Printer: **Canon PIXMA TS7451a** on the local WiFi network

## Quick start

```bash
# On the Pi (one-time bootstrap — needs git):
sudo apt install -y git
git clone https://github.com/serious-people-net/meet-petro ~/meet-petro
~/meet-petro/scripts/pi-setup.sh        # installs everything, idempotent

# Test the kiosk (does NOT autostart until you `enable` it):
sudo systemctl start petro-kiosk        # build (if changed) + serve + display
journalctl -u petro-kiosk -f            # watch it
sudo systemctl stop  petro-kiosk        # take it down
```

The setup script needs `sudo`. During build/test we ran it with passwordless
sudo for `olifrost` (`/etc/sudoers.d/010-petro-nopasswd`); **remove that once
finalised**: `sudo rm /etc/sudoers.d/010-petro-nopasswd`.

## What `scripts/pi-setup.sh` installs (idempotent)

- `cage` — Wayland kiosk compositor (runs one fullscreen app: the browser)
- `chromium` — the browser
- `python3-flask` — serves `dist/` **and** handles `/api/print` (one process)
- `cups` — printing (printer model still TBD)
- `seatd` — seat manager so cage gets the GPU + input **without** a login
  session on a VT (the key to launching headless / over SSH)
- `git`, `curl`, and **Node 22** (NodeSource) to build the frontend
- clones the repo to `~/meet-petro`
- installs `petro-kiosk.service` but does **not** enable it (no autostart yet)

## The launch flow (`scripts/pi-kiosk.sh`)

Run by the service (or by hand). On each launch it:

1. `cd ~/meet-petro`
2. if online: `git pull`, then `npm install && npm run build` **only if** the
   code changed or `dist/`/`node_modules` is missing — so an unchanged boot is
   instant, fresh code rebuilds, and offline falls back to the last good build
3. starts Flask (`server/app.py`, port 8080) and waits for it to answer
4. `exec cage -- chromium --kiosk … http://localhost:8080/app/?app`

## How it gets a display headless (the non-obvious part)

A Wayland compositor needs DRM master (the GPU) + input. Launched from a
service (or SSH) there's no foreground login session to grant that. **seatd**
solves it: it runs as root, owns the seat, and hands cage the GPU on request.
The unit sets `LIBSEAT_BACKEND=seatd` and `XDG_RUNTIME_DIR=/run/petro-kiosk`
(a systemd `RuntimeDirectory`). `olifrost` is in the `video` group, which owns
`/run/seatd.sock`, so it can talk to seatd.

## Display / resolution

The panel should come up at its native mode from EDID. **If it doesn't show
1080×1080**, force it at the KMS level (works under Wayland; `xrandr` does
not) by adding to `/boot/firmware/cmdline.txt` (one line, space-separated):

```
video=HDMI-A-1:1080x1080@60
```

For a fully custom modeline or a panel with no/bad EDID, supply an EDID
override file via `drm.edid_firmware=HDMI-A-1:edid/petro.bin` instead. Decide
once the real panel is in hand.

**Connect the display before `systemctl start`.** cage selects outputs at
startup; if you hotplug the panel while it's already running, restart the
service (`sudo systemctl restart petro-kiosk`).

## Printer (Canon PIXMA TS7451a)

The printer is on the local WiFi. It was added using driverless IPP Everywhere —
no Canon-specific driver needed.

```bash
# Discover the printer's IPP URI via mDNS (avahi-utils must be installed):
sudo apt-get install -y avahi-utils
avahi-browse -rpt _ipp._tcp | grep -i canon     # find the IP + port

# Add it to CUPS:
sudo lpadmin -p petroprinter -E \
  -v ipp://192.168.1.187:631/ipp/print \
  -m everywhere
lpstat -p                                        # confirm "petroprinter" is idle

# Test print (A5, greyscale, high quality, duplex, rear tray):
lp -d petroprinter \
   -o media=A5 -o media-source=rear \
   -o print-color-mode=monochrome -o print-quality=5 \
   -o print-scaling=fill -o sides=two-sided-long-edge \
   ~/meet-petro/dist/printouts/WIFE.png
```

`PRINTER_NAME = "petroprinter"` is already set in `server/app.py`. The server
uses ImageMagick (`convert`) to combine the idea sheet and `BACK-COVER.png` into
a two-page PDF, then prints it duplex (long-edge, rear tray). ImageMagick must
be installed on the Pi:

```bash
sudo apt-get install -y imagemagick
```

**Tray options:** `media-source=auto` (printer chooses), `main` (front cassette),
`rear` (rear tray). Exhibit setup uses `rear`.

**Future:** for a stand-alone exhibit without site WiFi, connect the Pi directly
to the printer's WiFi Direct AP. The Pi would then have no internet, so the
kiosk script's `git pull` step would be skipped and it would use the last build.

## Escape hatches

- **Over SSH (cleanest):** `ssh petro 'sudo systemctl stop petro-kiosk'`
  — verified: tears down cage, chromium, and Flask in one shot, releases the
  GPU. `sudo systemctl start petro-kiosk` brings it back.
- **Blunt:** `pkill -f cage` (the service has `Restart=no`, so it stays down).
- **On the Pi keyboard:** `Ctrl+Alt+F2` switches to a text TTY (works under
  KMS/Wayland) — log in as `olifrost`, manage, `Ctrl+Alt+F1` to switch back.
  cage has no custom keybindings, so VT-switch + SSH is the escape (no Alt+F4).

## Autostart (enable when finalised)

```bash
sudo systemctl enable petro-kiosk      # now survives reboot
sudo reboot                            # confirm it comes up into the app
```

## Cursor suppression (kiosk)

The app CSS sets `cursor: none !important` so no software cursor is rendered by
Chromium. The harder problem is the **hardware cursor** drawn by
wlroots/cage itself before Chromium has loaded.

**What was tried:**

1. `XCURSOR_THEME=Hidden` env var — wlroots reads this theme to pick a cursor
   image. We created `~/.local/share/icons/Hidden/index.theme` (required so
   XCursor validates the theme; without it, wlroots falls back to `default`).
2. Transparent XCursor binary files — created 36 cursor names (incl. `default`,
   `left_ptr`) as 1×1 transparent images in
   `~/.local/share/icons/Hidden/cursors/`. The cursor disappears once Chromium
   loads and an input event fires, but the cursor is briefly visible at startup.

**Current status:** cursor vanishes after the first touch/input event but is
visible for a second or two on cold boot. Root cause: wlroots renders the cursor
at startup before reading the theme, or the theme lookup is deferred until the
first pointer event. No fully clean fix found yet without patching cage.

**Workaround candidates not yet tried:**
- Start cage with `WLR_NO_HARDWARE_CURSORS=1` (forces software cursor path —
  may have side-effects with touch input)
- Delay the kiosk script so the system is fully idle before cage starts

## Verification status

**Verified (June 2026):**

- [x] Full stack installs from a fresh Lite image via `pi-setup.sh`
- [x] `systemctl start` builds the frontend, starts Flask, launches chromium
- [x] cage acquires the GPU via seatd; chromium loads `/app/?app` (HTTP 200)
- [x] `systemctl stop` cleanly tears everything down (escape hatch)
- [x] App renders fullscreen, correctly sized; nothing important clipped by the
      circular panel under `?app`
- [x] Panel comes up at 1080×1080 (else apply the KMS modeline above)
- [x] Keyboard arrows + Enter drive the flow; touch works (chevrons/taps/swipes)
- [x] Printing works end-to-end: Canon TS7451a on WiFi, A5, greyscale, duplex,
      rear tray; back cover (BACK-COVER.png) printed on reverse of every sheet
- [x] Print fires during "Now we're cooking!" loader; success screen delayed
      22 s (thinking animation) to allow time for the physical print to emerge

**Still to verify / known issues:**

- [ ] Cursor visible for ~1–2 s on cold boot before first touch event hides it
- [ ] Screen blanking off (`sudo raspi-config` → Display → Screen Blanking)
- [ ] Sound output confirmed on exhibit hardware
- [ ] `sudo systemctl enable petro-kiosk`, reboot, confirm it auto-launches
- [ ] Test all 20 audience×emotion combinations end-to-end
