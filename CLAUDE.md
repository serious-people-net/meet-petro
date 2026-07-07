# Petro

Exhibit kiosk running on a Raspberry Pi (`petro`). Full setup/architecture: `docs/PI-SETUP.md`.

## Reaching the Pi over SSH

There are **two different networks** the Pi can be on, and they need different
connection details. Figure out which one is live before trying to SSH.

1. **Home WiFi** (Oli's normal dev network — this is what "maintenance" network
   means in `scripts/wifi-switch.sh`/`docs/PI-SETUP.md`, it is *not* a network
   at the venue): use the `petro` alias — `ssh petro`. Defined in
   `~/.ssh/config` as `HostName 192.168.1.116` with `IdentityFile
   ~/.ssh/petro_ed25519`.

2. **At the venue** the Pi won't be on home WiFi. Two ways in, both reach the
   Pi at `petro.local` (mDNS) rather than the `petro` alias/IP, which is
   unreachable from either:
   - **Printer's WiFi Direct AP** (active whenever the printer is connected —
     see `docs/PI-SETUP.md#wifi-direct-exhibition-mode`): join that same
     WiFi network from your own machine first.
   - **Ethernet cable straight into the Pi**: works *regardless* of what
     wlan0 is doing (e.g. even while it's on the printer AP) — there's
     already a `netplan-eth0` NetworkManager profile that auto-connects, so
     plugging in just works, no wifi-switch juggling needed. Prefer this over
     joining the printer AP when both are possible — it doesn't fight with
     the printer connection at all.
   - Either way: `ssh -i ~/.ssh/petro_ed25519 olifrost@petro.local`.
     **You must pass `-i ~/.ssh/petro_ed25519` explicitly** — `petro.local`
     isn't in `~/.ssh/config`, so a bare `ssh petro.local` tries the default
     keys and fails with "Permission denied (publickey)".

If `ssh petro` times out, that's the signal you're on scenario 2 — don't keep
retrying the home address, switch to the `petro.local` address instead.

## Known gotcha: stale/broken `dist/` when offline

`pi-kiosk.sh` only rebuilds the frontend when it can reach the internet
(`curl https://github.com`). At the actual exhibit the Pi is offline (printer
AP has no internet), so it **always** reuses whatever is already in `dist/` on
disk, with no check that the build is actually complete. If a previous build
was interrupted (e.g. power loss mid-`npm run build`), `dist/` can be left
with only copied `public/` assets and no `index.html`/JS bundles — Flask then
404s on every route, and Chromium's kiosk view just spins/fails to load
("can't connect"-looking error), even though the service itself is "running"
fine per `journalctl -u petro-kiosk`.

Diagnose by checking `dist/app/index.html` exists; fix by SSHing in (see
above) and running `npm run build` by hand, then `sudo systemctl restart
petro-kiosk`.

## Boot media: the root cause of slow boot, and why it matters more than it looks

The Pi boots off a **SanDisk Cruzer Edge USB stick** (`/dev/sda`, plugged into
a **USB 2.0** port) — not the SD card slot. Measured sequential read: **~24
MB/s**, well below even typical USB 2.0 (~35-40 MB/s) and far below a decent
SD card or USB3 SSD. This — not something newly broken — is almost certainly
why boot feels slow (`systemd-analyze` showed ~1m45s to `multi-user.target`
alongside `journalctl`-visible `npm run build` / chromium startup time on top
of that). No read errors were seen in `dmesg`, so the stick isn't currently
*failing*, just slow.

This is worth treating as a reliability risk, not only a speed one: cheap USB
flash sticks are one of the most common Pi failure points in kiosk/exhibit
deployments (wear from constant small writes — journald, browser cache, git/
npm — plus generally low-endurance flash controllers). The Pi 5 has unused
USB3 ports (`lsusb -t` shows two 5000M root hubs idle) — moving the boot
volume to a real USB3 SSD/flash drive in one of those would fix both the
speed and most of the endurance risk in one move, and is a more valuable fix
than keeping the current Cruzer stick as a spare.

If a spare boot drive is wanted as insurance regardless, the right way to use
it is as a **periodically-refreshed clone of the (new, faster) primary**
(e.g. `rpi-clone` or `dd` of `/dev/sda` to the spare) so a swap-in is a like-
for-like recovery, not a stale one — boot media corruption/failure is
plausibly a higher-likelihood failure mode for this project than the printer
breaking, since the printer's failure modes (out of ink, paper jam, WiFi
Direct drop) are visible/recoverable in the moment, while boot media
corruption can silently strike mid-exhibit and take the whole kiosk down.

Unrelated but noticed in the same `dmesg`: the OLKB Preonic keyboard
(`usb 1-1`) dropped off around 11 minutes into this session's uptime and
never re-enumerated (`unable to enumerate USB device`). Only saw it once —
worth keeping an eye on, and maybe having a spare keyboard/cable at the
venue, but not chased further since the app is primarily touch-driven.
