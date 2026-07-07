# Raw sound sources

**To swap a sound:** drop the new file in here using the filename below, run
`./scripts/process-sounds.sh` (needs ffmpeg — the Mac, not the Pi), then
`npm run build`. The script loudness-maximises everything into
`public/sounds/`; never edit those processed files directly.

| File | Plays when |
|------|-----------|
| `selector_sound.wav` | selector moves (the nav blip) |
| `startup.mp3` | power-on chime at the welcome screen |
| `small_celebration.wav` | short success — loader after each choice, incl. the first "let's get started" one; also the back-to-start reset (placeholder) |
| `final_success.mp3` | the big final success when the printout fires |
| `progress_loop.wav` | looped under the long "thinking" loader |
| `startup-2.mp3`, `ringtone.mp3` | not wired to anything — spares to audition |

The `SAMPLE_FILES` map in `src/App.tsx` is the single place mapping events to
files, and **every event is listed there** — set a filename to use a sample,
or leave it `''` to keep the original synth cue (select-click and land are
currently `''`). So to use a new filename, or fill an empty slot, edit one
line there.

The kiosk defaults to the sample set; the web demo defaults to synth. The
kiosk's admin panel (Ctrl+Shift+M) has a "Sound set" toggle to A/B them.
