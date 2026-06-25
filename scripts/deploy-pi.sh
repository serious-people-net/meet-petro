#!/usr/bin/env bash
# Build the frontend and push everything the Pi needs.
# Usage: ./scripts/deploy-pi.sh [host]   (default: petro)
set -euo pipefail

HOST="${1:-petro}"
DEST="~/meet-petro"

cd "$(dirname "$0")/.."

npm run build
rsync -av --delete              dist/    "$HOST:$DEST/dist/"
rsync -av                       server/  "$HOST:$DEST/server/"
rsync -av --perms               scripts/ "$HOST:$DEST/scripts/"

ssh "$HOST" 'sudo systemctl restart petro-kiosk 2>/dev/null || true'
echo "Deployed to $HOST"
