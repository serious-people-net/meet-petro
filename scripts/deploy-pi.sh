#!/usr/bin/env bash
# Build the frontend and push everything the Pi needs.
# Usage: ./scripts/deploy-pi.sh [host] [--force]   (default host: petro)
#
# Refuses to deploy a dirty working tree: the Pi runs a built copy of your
# local source, so any uncommitted edit would silently drift onto the device
# with no commit to trace it back to. Commit (and ideally push) first, or pass
# --force for a deliberate throwaway test deploy.
set -euo pipefail

HOST="petro"
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    *) HOST="$arg" ;;
  esac
done
DEST="~/meet-petro"

cd "$(dirname "$0")/.."

if [ "$FORCE" -eq 0 ] && { ! git diff --quiet || ! git diff --cached --quiet; }; then
  echo "✗ Uncommitted changes — commit (and push) before deploying so the Pi stays in sync." >&2
  echo "  Use --force to deploy anyway (throwaway test build)." >&2
  git status -s >&2
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
if [ -n "$(git log @{u}..HEAD --oneline 2>/dev/null)" ]; then
  echo "⚠ HEAD ($SHA) is not pushed to its upstream yet — the Pi can't 'git pull' this." >&2
fi

npm run build
# Stamp the build so you can check what the Pi is actually running.
printf '%s\n' "$SHA $(git show -s --format=%ci HEAD)$([ "$FORCE" -eq 1 ] && echo ' +dirty')" > dist/VERSION
rsync -av --delete              dist/    "$HOST:$DEST/dist/"
rsync -av                       server/  "$HOST:$DEST/server/"
rsync -av --perms               scripts/ "$HOST:$DEST/scripts/"

ssh "$HOST" 'sudo systemctl restart petro-kiosk 2>/dev/null || true'
echo "Deployed to $HOST"
