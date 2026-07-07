# Raw sound sources

**To swap a sound:** drop the new file in here using the filename below, run
`./scripts/process-sounds.sh` (needs ffmpeg — the Mac, not the Pi), then
`npm run build`. The script loudness-maximises everything into
`public/sounds/`; never edit those processed files directly.

| File | Plays when |
|------|-----------|
| `selector_sound.wav` | selector moves (the nav blip) |
| `small_celebration.wav` | short success — loader after each choice, incl. the first "let's get started" one; also the back-to-start reset (placeholder) |
| `final_success.mp3` | the big final success when the printout fires |
| `progress_loop.wav` | looped under the long "thinking" loader |

To use a **new filename** (e.g. give reset its own `reset.wav`), also update
the `SAMPLE_FILES` map in `src/App.tsx` — that's the single place mapping
events to files. Events without an entry (select-click, power-on, land)
still use the original synth sounds.

The kiosk's admin panel (Ctrl+Shift+M) has a "Sound set" toggle to A/B the
sample set against the old synth set.
