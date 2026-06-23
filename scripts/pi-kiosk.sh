#!/usr/bin/env bash
# Launch the Petro kiosk. Run by petro-kiosk.service, or by hand for testing.
#
# Flow: optionally pull + build the latest code (only when online and changed),
# serve dist/ via Flask, then display it fullscreen in Chromium under cage.
set -euo pipefail

REPO="${PETRO_REPO:-$HOME/meet-petro}"
PORT=8080
URL="http://localhost:${PORT}/app/?app"
# cage/Wayland needs a writable runtime dir for its socket; the service's login
# session sets this, but fall back sensibly for manual runs.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

cd "$REPO"

echo "petro-kiosk: repo $REPO"

# --- Update + build, only when online and the code actually changed ---
if curl -fsS --max-time 5 https://github.com >/dev/null 2>&1; then
  before="$(git rev-parse HEAD 2>/dev/null || echo none)"
  git pull --ff-only || echo "petro-kiosk: git pull failed; using local code"
  after="$(git rev-parse HEAD 2>/dev/null || echo none)"
  if [ "$before" != "$after" ] || [ ! -d dist ] || [ ! -d node_modules ]; then
    echo "petro-kiosk: installing deps + building…"
    npm install --no-audit --no-fund
    npm run build
  else
    echo "petro-kiosk: code unchanged — skipping build"
  fi
else
  echo "petro-kiosk: offline — using existing dist/"
fi

if [ ! -d dist ]; then
  echo "petro-kiosk: no dist/ and unable to build — aborting" >&2
  exit 1
fi

# --- Serve the build (Flask also handles /api/print) ---
python3 server/app.py &
FLASK_PID=$!
trap 'kill "$FLASK_PID" 2>/dev/null || true' EXIT INT TERM

# Wait for the server to come up before opening the browser.
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:${PORT}/app/" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

# --- Kiosk: cage runs Chromium fullscreen and exits when it does ---
exec cage -- chromium \
  --kiosk \
  --enable-features=UseOzonePlatform \
  --ozone-platform=wayland \
  --touch-events=enabled \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --password-store=basic \
  --check-for-update-interval=31536000 \
  "$URL"
