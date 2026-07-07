#!/usr/bin/env bash
# Print one copy of every audience/emotion idea sheet, so we have a paper
# backup set in case the exhibit printer dies mid-event.
#
# Run from the Mac. Talks to the Pi's Flask server (server/app.py) over
# HTTP, using the SAME /api/print endpoint the kiosk itself uses — so what
# gets printed is exactly what a visitor would trigger, no local file
# fiddling.
#
# Usage:
#   scripts/print-backup-set.sh                 # auto-detect host, print one set
#   scripts/print-backup-set.sh petro.local      # force host (e.g. at the venue)
#   scripts/print-backup-set.sh petro.local 8080 # override port too
#
# After printing a set it asks whether to print another (for handing out
# more sets, or in case a sheet jams and you want to redo the whole run).

set -euo pipefail

PORT="${2:-8080}"

pick_host() {
  if [[ -n "${1:-}" ]]; then
    echo "$1"
    return
  fi
  # Home WiFi alias first (see CLAUDE.md), then venue mDNS name.
  if curl -sf -m 3 "http://petro:${PORT}/api/network" >/dev/null 2>&1; then
    echo "petro"
    return
  fi
  if curl -sf -m 3 "http://petro.local:${PORT}/api/network" >/dev/null 2>&1; then
    echo "petro.local"
    return
  fi
  echo "Could not reach the Pi at 'petro' or 'petro.local'." >&2
  echo "Are you on the right network? See CLAUDE.md for the two-network setup." >&2
  exit 1
}

HOST="$(pick_host "${1:-}")"
BASE="http://${HOST}:${PORT}"
echo "Using Pi at ${BASE}"

MATRIX_JSON="$(curl -sf -m 5 "${BASE}/printouts/matrix.json")"

# Print one row per "audience emotion", skipping the "default" fallback key.
PAIRS="$(python3 -c '
import json, sys
matrix = json.loads(sys.argv[1])
for key in matrix:
    if key == "default" or key.startswith("_"):
        continue
    audience, emotion = key.split(".", 1)
    print(f"{audience} {emotion}")
' "$MATRIX_JSON")"

COUNT="$(echo "$PAIRS" | wc -l | tr -d ' ')"

print_set() {
  local n=0
  while IFS=' ' read -r audience emotion; do
    n=$((n + 1))
    echo "[$n/$COUNT] Printing ${audience} / ${emotion} ..."
    RESPONSE="$(curl -sf -m 15 -X POST "${BASE}/api/print" \
      -H 'Content-Type: application/json' \
      -d "{\"audience\": \"${audience}\", \"emotion\": \"${emotion}\"}")"
    OK="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1]).get("ok"))' "$RESPONSE")"
    if [[ "$OK" != "True" ]]; then
      echo "  FAILED: $RESPONSE" >&2
      exit 1
    fi
    # Give the printer breathing room between jobs.
    sleep 2
  done <<< "$PAIRS"
  echo "Backup set printed (${COUNT} sheets)."
}

print_set

while true; do
  read -r -p "Print another full set? [y/N] " ANSWER
  case "$ANSWER" in
    [Yy]*) print_set ;;
    *) break ;;
  esac
done
