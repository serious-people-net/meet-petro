// Tiny synth for UI sounds — Web Audio only, no samples.
// Every sound is a short sequence of soft square-wave blips,
// in keeping with the corporate-terminal feel.

let ctx: AudioContext | null = null

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Browsers block audio until a user gesture; call this on the first
// keydown/touch so everything after is audible.
export function unlockAudio() {
  audio()
}

function blip(
  freq: number,
  at: number,
  duration = 0.07,
  type: OscillatorType = 'square',
  peak = 0.04,
) {
  const ac = audio()
  const t = ac.currentTime + at
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0005, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

export const sounds = {
  // Carousel step
  tick() {
    blip(660, 0, 0.05)
  },
  // Confirm a choice
  select() {
    blip(523, 0, 0.07)
    blip(784, 0.08, 0.1)
  },
  // Big success moment (boot complete, idea ready)
  success() {
    blip(523, 0, 0.09)
    blip(659, 0.1, 0.09)
    blip(784, 0.2, 0.09)
    blip(1047, 0.3, 0.22, 'square', 0.05)
  },
  // Soft dismiss / advance
  advance() {
    blip(440, 0, 0.06)
    blip(587, 0.07, 0.08)
  },
}
