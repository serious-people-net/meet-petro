#!/usr/bin/env bash
# Loudness-maximise the raw sounds in sounds-src/ into public/sounds/.
#
# Workflow for trying new samples:
#   1. Drop the new file into sounds-src/ (keep the event's filename, see
#      sounds-src/README.md — same name = same slot in the app)
#   2. ./scripts/process-sounds.sh
#   3. npm run build   (the kiosk serves dist/, not public/)
#
# Short blips get a straight peak-normalise + limiter; anything longer gets
# two compression stages + limiter so the average level comes up hard.
# Run on a machine with ffmpeg (the Mac, not the Pi).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=sounds-src
OUT=public/sounds
CHAIN="acompressor=threshold=-30dB:ratio=8:attack=3:release=120:makeup=18dB,acompressor=threshold=-14dB:ratio=4:attack=3:release=100:makeup=6dB,alimiter=limit=0.98:attack=1.5:release=50:level=disabled"

for f in "$SRC"/*.wav "$SRC"/*.mp3; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")

  if awk "BEGIN{exit !($dur < 0.4)}"; then
    # Short blip: gain it so the peak sits at -0.3dB, limiter as safety net
    peak=$(ffmpeg -i "$f" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-*[0-9.]*\) dB/\1/p')
    gain=$(awk "BEGIN{printf \"%.1f\", -0.3 - ($peak)}")
    filter="volume=${gain}dB,alimiter=limit=0.99:level=disabled"
  else
    filter=$CHAIN
  fi

  case "$name" in
    *.mp3) codec=(-codec:a libmp3lame -q:a 0) ;;
    *)     codec=() ;;
  esac
  ffmpeg -y -v error -i "$f" -af "$filter" ${codec[@]+"${codec[@]}"} "$OUT/$name"

  ffmpeg -i "$OUT/$name" -af volumedetect -f null - 2>&1 \
    | sed -n "s/.*\(mean_volume.*\)/$name  \1/p;s/.*\(max_volume.*\)/$name  \1/p"
done

echo "done → $OUT (remember: npm run build)"
