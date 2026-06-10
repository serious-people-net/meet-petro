# Petro — Project Brief

## What it is

A gallery installation. A beige retro corporate terminal (custom housing,
mechanical keyboard, **1080×1080 round display**) runs a web app starring
**Petro**, a friendly cartoon oil barrel — "your automated oil and gas
marketer", essentially Clippy for the fossil fuel industry. Visitors pick
an **audience** and an **emotion to manipulate**; Petro theatrically
"generates" an ad idea and a connected printer outputs a pre-generated
artwork (a "Decept").

The satire: *"Petro provides consciousness, without the conscience."*
Trained on decades of lobbying and propaganda. Denial. Delay. Deception.
Petro makes it easy.

## User flow

1. **Boot** — circle fills, success chime (first page load only, just theatre)
2. **Intro** — "Hi! I'm Petro / Your automated oil and gas marketer" — [press enter to begin]
3. **Instruction** — "Let's go! Who do you want to influence?" — auto-dismisses
4. **Select Audience** — carousel, ‹ › + enter
5. **Instruction** — "Nice! Let's pick an emotion to manipulate" — auto-dismisses
6. **Select Emotion** — carousel. **Print fires on confirm**
7. **Generating** — Petro at the easel, theatrical uneven loading bar, cycling captions
   ("Ok! I'm on it!" → "Having deep strategic thoughts…" → "Thinking of world-first ideas" → "Cutting down some trees…")
8. **Success** — "Your idea is ready" — any key restarts, or auto-resets

## Design direction

- Slightly retro, in the Severance / Silo / Fallout sense — vintage terminal
  futurism, but understated. Don't over-egg it.
- Consistent screen anatomy: text top, illustration middle, element bottom.
- Stick to the given copy. No emojis, no embellishment. Understated,
  slightly opaque and curious.
- Simple Web Audio bleeps/bloops for interactions, success arpeggio.
- Text fades in/up; Petro gently hovers.

## Inputs

- Arrow keys (left/right and up/down equivalent) + Return — primary.
- Touch: chevron taps, tap-to-confirm, horizontal swipe on carousels.

## Contexts

1. **Gallery (primary)** — Pi in kiosk mode, 1080×1080 round display
   (the panel itself clips to a circle), thermal/inkjet printer TBD via CUPS.
2. **Online demo** — seriouspeople.co/meetpetro/demo (GitHub Pages):
   identical app, but shows the generated artwork instead of printing.
3. **Product page** — seriouspeople.co/meetpetro: simple hero + 3 features +
   demo invitation. **Not built yet, deliberately.**

## Data (expected to change)

- Audiences: Divorced Men, Concerned Mothers, Disenfranchised Youth
  (UX flow also showed Hard Working Citizens)
- Emotions: Fear, Nostalgia, Anger, Gratitude
  (UX flow also showed Hope / Nostalgic variants)
- All Petro illustrations are placeholders awaiting the illustrator.
- Printouts are pre-generated A4 PNGs (2480×3508), one per
  audience×emotion combination.

## Display settings (for reference)

```
xrandr --newmode "1080x1080R" 82.50 1080 1128 1160 1240  1080 1083 1093 1111 +hsync -vsync
xrandr --addmode DP-1 "1080x1080R"
xrandr --output DP-1 --mode "1080x1080R"
```

## Inspiration copy (not used in app)

> No human should ever have to promote the downfall of the planet they
> live on. So we made an agent to do it. Petro lets you automate your
> agency's oil and gas marketing. Denial. Delay. Deception. Petro makes
> it easy. No longer will agencies have to deal with staff walk outs and
> "moral objections". Petro provides consciousness, without the
> conscience. Petro was trained on decades of lobbying and propaganda,
> created by the best Advertising and PR firms in the business. Simply
> choose the audience and emotion you want to manipulate, and Petro
> draws and prints an idea in seconds. These print outs are known as
> 'Decepts'. We are excited to invite you to our Demo Day to see the
> future of fossil fuel marketing for yourself. — meetpetro.com
