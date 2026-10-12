# Petro

Exhibit kiosk running on a Raspberry Pi (`petro`). Full setup/architecture: `docs/PI-SETUP.md`.

## Always commit and deploy

After any change to the app/server/scripts: **commit, push, then run
`./scripts/deploy-pi.sh`** (no need to ask — Oli wants this every time). The
script refuses a dirty tree, builds, stamps `dist/VERSION` with the git sha +
commit date (shown in the admin panel's "Build" row), rsyncs
dist/server/scripts to the Pi and restarts the kiosk. It's push-based over
SSH, so it needs **no internet on the Pi** — at the venue run
`./scripts/deploy-pi.sh petro.local` over ethernet or the printer AP.

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
   - Either way: `ssh petro.local` — there's a `Host petro.local` block in
     `~/.ssh/config` (user + IdentityFile) so the bare hostname just works,
     including for `./scripts/deploy-pi.sh petro.local`.

If `ssh petro` times out, that's the signal you're on scenario 2 — don't keep
retrying the home address, switch to the `petro.local` address instead.

## Known issues

See `docs/PI-SETUP.md` › Known issues: a stale/incomplete `dist/` when the Pi is offline (kiosk 404s; check `dist/app/index.html`, rebuild by hand, restart `petro-kiosk`), and slow USB-stick boot media (a reliability risk; move to a USB3 SSD).
