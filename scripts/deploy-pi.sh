#!/usr/bin/env bash
# Build the frontend and push everything the Pi needs.
# Usage: ./scripts/deploy-pi.sh [host]   (default host: petro)
set -euo pipefail

HOST="${1:-petro}"
DEST="~/petro"

cd "$(dirname "$0")/.."

npm run build
rsync -av --delete dist/ "$HOST:$DEST/dist/"
rsync -av server/ "$HOST:$DEST/server/"

echo "Deployed. On the Pi: cd ~/petro/server && python app.py"
echo "(systemd restarts it automatically if the petro service is installed — see docs/PI-SETUP.md)"
ssh "$HOST" 'sudo systemctl restart petro 2>/dev/null || true'
