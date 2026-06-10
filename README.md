# Petro

A gallery installation: Petro, your automated oil and gas marketer, helps
you design a fossil-fuel ad. Pick an audience and an emotion to manipulate;
Petro prints a pre-generated idea (a "Deceipt").

Read [docs/BRIEF.md](docs/BRIEF.md) for the full concept and
[docs/PI-SETUP.md](docs/PI-SETUP.md) for the exhibit hardware.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 — circular preview, demo fallback
npm run build        # outputs dist/
```

URL params: `?demo` forces demo mode (show artwork instead of printing),
`?square` removes the circular mask to inspect what the round panel clips.

With no print server reachable, the app automatically behaves as the demo
(shows the artwork on the success screen) — so dev and GitHub Pages need
no configuration.

Full stack as on the Pi:

```bash
npm run build
pip install -r server/requirements.txt
python server/app.py # http://localhost:8080 — serves dist/ + /api/print
```

## Architecture

- **One fixed 1080×1080 stage** ([src/components/Stage.tsx](src/components/Stage.tsx)),
  scaled to fit the window. The Pi shows it 1:1; the round panel clips it.
  No responsive design anywhere.
- **Linear state machine** in [src/App.tsx](src/App.tsx):
  boot → intro → instruction → audience → instruction → emotion → generating → success.
- **Shared screen anatomy** ([src/components/Screen.tsx](src/components/Screen.tsx)):
  top text / illustration / bottom element, staggered fade-in. Every screen
  composes the same parts (`Title`, `KeyHint`, `Selector`, `ProgressBar`,
  `PetroFigure`, `Chevron`).
- **Input**: arrows + enter ([src/data/keys.ts](src/data/keys.ts) to rebind),
  plus touch taps and swipes driving the same handlers.
- **Sound**: synthesised Web Audio bleeps in [src/lib/sound.ts](src/lib/sound.ts).
- **Printing**: the frontend POSTs `{audience, emotion}` to `/api/print`;
  [server/app.py](server/app.py) (Flask) looks up the artwork and pipes it
  to CUPS via `lp`. Flask also serves `dist/`, so the Pi runs one process.

## Updating content (the usual edits)

| What | Where |
|---|---|
| Audiences / emotions + their illustrations | [src/data/options.ts](src/data/options.ts) |
| Petro's expressions per screen | [src/data/petro.ts](src/data/petro.ts) |
| On-screen copy | [src/data/copy.ts](src/data/copy.ts) |
| Which combination prints which file | [public/printouts/matrix.json](public/printouts/matrix.json) + drop PNGs in `public/printouts/` |
| Timings (loading theatre, auto-reset…) | [src/data/config.ts](src/data/config.ts) |
| Key bindings | [src/data/keys.ts](src/data/keys.ts) |

All illustration slots currently point at the placeholder
`src/assets/petro.png` (≈500×500 px source is plenty; it renders at 380 px).
Reference material from the brief lives in `src/assets/reference/`.

## Deploy

- **Pi**: `./scripts/deploy-pi.sh petro` (build + rsync + service restart).
- **GitHub Pages** (seriouspeople.co/meetpetro): publish `dist/` — the
  build uses relative paths so it works under any subpath. The product
  page at /meetpetro and demo at /meetpetro/demo are not built yet; the
  app is the demo for now.
