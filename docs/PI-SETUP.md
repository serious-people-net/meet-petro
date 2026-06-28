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
- User: `olifrost`; reachable as `ssh petro` (requires same network)
- Keyboard: ortholinear, has number row, **no F-keys**
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

### WiFi Direct (exhibition mode)

For a stand-alone exhibit the Pi connects to the **printer's WiFi Direct AP**
instead of venue WiFi. The printer acts as the AP; the Pi is the only client.
The Pi then has no internet, so `git pull` is skipped and the last good build
is used.

#### 1. Find the printer's WiFi Direct credentials

On the printer touchscreen:
**Settings → LAN settings → Wireless Direct → Show settings**
Note the SSID (`DIRECT-xxxx-TS7451a`) and password.

#### 2. Create NetworkManager profiles

`pi-setup.sh` runs `scripts/install-printer-wifi.sh` for you, which (re)creates the
`printer-direct` profile from the documented Canon credentials. Run it by hand to
recreate or update the profile after a reimage, or pass new credentials:

```bash
# Defaults: ssid DIRECT-4Vpetro / psk meetpetro1
sudo ~/meet-petro/scripts/install-printer-wifi.sh

# Or override from the printer's screen (LAN settings -> Wireless Direct):
PRINTER_SSID="DIRECT-xxxx-TS7451a" PRINTER_PSK="..." \
  sudo -E ~/meet-petro/scripts/install-printer-wifi.sh
```

The maintenance/venue network is whatever NetworkManager profile already connects
the Pi to the internet (e.g. `netplan-wlan0-The Internet`); `wifi-switch.sh
maintenance` brings that one up. Adjust the name in `wifi-switch.sh` if yours
differs.

#### 3. Allow Flask to trigger network switches (sudoers, run once)

The in-app maintenance shortcut calls `wifi-switch.sh` via sudo:

```bash
echo 'olifrost ALL=(root) NOPASSWD: /home/olifrost/meet-petro/scripts/wifi-switch.sh' \
  | sudo tee /etc/sudoers.d/020-petro-wifi
sudo chmod 0440 /etc/sudoers.d/020-petro-wifi
sudo chmod +x /home/olifrost/meet-petro/scripts/wifi-switch.sh
```

#### 4. Test printing on the direct network

```bash
# Connect to the printer's AP
sudo nmcli con up printer-direct

# Discover the printer's IP on this network (usually 192.168.0.1 for Canon)
avahi-browse -rpt _ipp._tcp | grep -i canon

# Update CUPS to use the new IP
sudo lpadmin -x petroprinter
sudo lpadmin -p petroprinter -E \
  -v ipp://192.168.115.1:631/ipp/print \
  -m everywhere
lpstat -p    # confirm "petroprinter" idle

# Test print
lp -d petroprinter -o PageSize=A5 -o InputSlot=Rear \
  ~/meet-petro/dist/printouts/WIFE.png
```

## Escape hatches

- **In-app shortcut (primary):** `Ctrl+Shift+M` switches to the maintenance
  WiFi network and shows the Pi's IP on screen. SSH in, do your work, then
  `Ctrl+Shift+M` again to return to the printer network. Designed for the
  ortholinear keyboard (no F-keys). See [WiFi Direct setup](#wifi-direct-exhibition-mode)
  for the one-time NM profile + sudoers setup this requires.
- **Over SSH (if already on the same network):** `ssh petro 'sudo systemctl stop petro-kiosk'`
  — tears down cage, chromium, and Flask in one shot. `sudo systemctl start petro-kiosk` brings it back.
- **Blunt:** `pkill -f cage` (the service has `Restart=no`, so it stays down).
- **Note:** `Ctrl+Alt+F2` (TTY switch) is documented elsewhere but requires F-keys —
  the exhibit keyboard is ortholinear with no F-row, so it won't work.

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
   image. The transparent `Hidden` theme (`index.theme` + 1×1 transparent XCursor
   binaries aliased to every common cursor name) lives in
   `~/.local/share/icons/Hidden/`. It is generated by
   `scripts/install-hidden-cursor.sh`, which `pi-setup.sh` runs so the theme
   survives a reimage — **if the theme is missing, `XCURSOR_THEME=Hidden` falls
   back to the visible `default` cursor and the replug below just reveals it.**
2. The cursor disappears once Chromium loads and an input event fires, but is
   briefly visible at startup — hence the replug below.

**Root cause:** the WaveShare round panel enumerates as an *absolute pointer*
(`mouse0` in `/proc/bus/input/devices`), not a pure touch device. So wlroots/cage
creates a cursor for it and parks it at screen centre on startup. cage only applies
the transparent xcursor theme when it next *(re)sets* the cursor image — which is
deferred until a pointer device is (re)attached. That is exactly why physically
unplugging/replugging the panel makes the cursor vanish: the re-enumeration is the
event that finally applies the theme, and it then stays hidden for the session.

Things that do **not** fix it (verified on the exhibit Pi): the transparent
`XCURSOR_THEME=Hidden` theme alone (works only *after* the first event), and
`WLR_NO_HARDWARE_CURSORS=1` (the startup cursor isn't a hardware-plane default).

**Fix applied:** automate the re-attach. `scripts/hide-cursor-replug.sh` does a
*software* USB unplug/replug of the WaveShare panel (toggles its
`/sys/bus/usb/devices/<dev>/authorized` flag) a few seconds after cage starts. This
is identical to the manual replug that was already known to hide the cursor — no
theme timing, no daemon, no internet, no extra packages. It is wired into
`petro-kiosk.service` as `ExecStartPost=+…` (the `+` runs it as root, needed for
sysfs, even though the service runs as the kiosk user). The script resolves the
panel by USB vendor:product (`0712:000a`) so it survives port changes, and is a safe
no-op if the panel isn't found. **Note:** this only runs under systemd — a manual
`pi-kiosk.sh` run won't auto-hide the cursor (replug by hand for testing).

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
