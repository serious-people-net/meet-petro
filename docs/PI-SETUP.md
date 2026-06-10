# Raspberry Pi Setup (the "petro" Pi)

Instructions for setting up the exhibit Pi from a fresh Raspberry Pi OS
install. **Note:** the Pi reachable as `pi` from this machine is Oli's
home server — do not touch it. The exhibit Pi is `petro` (set up SSH
config / hostname accordingly when it exists).

## 1. Dependencies

```bash
sudo apt update
sudo apt install -y chromium-browser python3-flask cups
# or, in a venv: pip install -r server/requirements.txt
```

## 2. Display

The round display runs at 1080×1080 with a custom modeline. Add to the
session startup (or /etc/xdg/autostart, depending on the OS's desktop):

```bash
xrandr --newmode "1080x1080R" 82.50 1080 1128 1160 1240  1080 1083 1093 1111 +hsync -vsync
xrandr --addmode DP-1 "1080x1080R"
xrandr --output DP-1 --mode "1080x1080R"
```

The panel itself clips to a circle — the app renders a white circle on
black at exactly 1080×1080, so what the dev sees masked in the browser
is what the panel shows.

Also disable screen blanking: `raspi-config` → Display → Screen Blanking → off.

## 3. Printer (model TBD)

Once the printer model is known:

```bash
sudo lpadmin -p petroprinter -E -v <device-uri> -m <driver>
lpstat -p                      # confirm the name
lp dist/printouts/fear-divorcedmen.png   # test print
```

Then set `PRINTER_NAME = "petroprinter"` in `server/app.py` (leave as
`None` to use the system default printer).

## 4. App as a service

Deploy from the dev machine: `./scripts/deploy-pi.sh petro`
(builds the frontend, rsyncs `dist/` and `server/` to `~/petro/`).

`/etc/systemd/system/petro.service`:

```ini
[Unit]
Description=Petro server
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/petro/server/app.py
WorkingDirectory=/home/pi/petro/server
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now petro
```

Flask serves the built frontend, so this is the only process —
the kiosk browser just points at it.

## 5. Kiosk mode

Autostart Chromium fullscreen at the local server. For the default
Wayland/labwc desktop, add to `~/.config/labwc/autostart` (or for X11,
`/etc/xdg/lxsession/LXDE-pi/autostart`):

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --check-for-update-interval=31536000 "http://localhost:8080/app/?app"
```

### Escape hatch during the exhibit

Keep it simple and standard:

- **Alt+F4** closes Chromium (kiosk mode blocks most chrome UI but not
  the window manager's close). systemd does NOT restart the browser, so
  you land on the desktop to maintain things; reboot to return to kiosk.
- **Ctrl+Alt+F2** switches to a raw TTY (login: pi) without touching the
  browser at all — good for checking logs (`journalctl -u petro -f`).
- SSH from a phone/laptop on the same network is the least disruptive:
  `ssh petro`.

If a dedicated Ctrl+Shift+Q binding is wanted, map it in the window
manager config (labwc: `~/.config/labwc/rc.xml` keybind to
`pkill chromium`), but Alt+F4 + SSH usually covers it.

## 6. Sanity checklist before opening

- [ ] Page survives a reboot into kiosk mode
- [ ] Keyboard arrows + enter drive the app
- [ ] Touch works (chevrons, taps, swipes)
- [ ] Test print from each audience×emotion combination
- [ ] Screen blanking is off, sound output works
- [ ] `?app` URL param present (bare screen, no device chrome) and nothing
      important is clipped by the circular panel
