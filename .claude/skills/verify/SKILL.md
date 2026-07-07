---
name: verify
description: How to run and verify the Petro web experience and product page locally
---

# Verifying Petro locally

- **Product page + web demo (dev):** `npm run dev -- --port 5199` → http://localhost:5199/. The demo opens via the "TRY THE DEMO" nav button.
- **Gotcha — Decept artwork is broken in dev:** `resolveDecept` fetches `../printouts/matrix.json` relative to `import.meta.url`, which in dev resolves to `/src/printouts/` (doesn't exist → Vite returns index.html → JSON parse fails → web success screen silently falls back to the kiosk-style screen). To see the real `WebSuccessScreen`, use the built app: `npm run build && npx vite preview --port 5200`.
- **Kiosk view:** `/app/?app` on the preview server (`?app` strips device chrome; kiosk-only code paths key off it).
- **Driving the flow:** welcome screen → click anywhere → 2.8s loader → audience selector (click Petro to confirm) → 2.2s loader → emotion selector → confirm → ~2.2s + 8s loaders (22s think in kiosk mode) → success screen. Playwright works fine; wait on `.selector`, `.web-success`, `.legend`.
- Console always logs pre-gesture `AudioContext` autoplay warnings — pre-existing noise, ignore.
