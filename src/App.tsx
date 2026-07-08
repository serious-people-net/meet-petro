import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/* ---- mascot image registry ----------------------------------------- */
const mascotModules = import.meta.glob<string>('./assets/mascots/*.png', { eager: true, import: 'default' })
const MASCOTS: Record<string, string> = {}
for (const [path, url] of Object.entries(mascotModules)) {
  const name = path.match(/\/([^/]+)\.png$/)?.[1]
  if (name) MASCOTS[name] = url
}

const AUDIENCE_MASCOT: Record<string, string> = {
  'Concerned Moms': 'MUM',
  'Disenfranchised Youth': 'GOTH',
  'Divorced Men': 'DIVORCE',
  'Hard-Working Citizens': 'WORKER',
}
const EMOTION_MASCOT: Record<string, string> = {
  'Anger': 'ANGER',
  'Nostalgia': 'NOSTALGIC',
  'Fear': 'FEAR',
  'Hope': 'HOPEFUL',
  'Pride': 'PRIDE',
}

function getMascotSrc(audience?: string, emotion?: string): string {
  const fallback = MASCOTS['OILY'] ?? ''
  if (!audience) return fallback
  const char = AUDIENCE_MASCOT[audience]
  if (!char) return fallback
  const emo = emotion ? (EMOTION_MASCOT[emotion] ?? 'DEFAULT') : 'DEFAULT'
  // DAD-ANGER covers the Divorced Men + Anger variant
  if (char === 'DIVORCE' && emo === 'ANGER') return MASCOTS['DAD-ANGER'] ?? fallback
  return MASCOTS[`${char}-${emo}`] ?? fallback
}

const warmed = new Set<string>()
function warmImage(src: string) {
  if (!src || warmed.has(src)) return
  warmed.add(src)
  const img = new Image()
  img.src = src
}

/* ---- content ------------------------------------------------------- */
const AUDIENCES = ['Concerned Moms', 'Disenfranchised Youth', 'Divorced Men', 'Hard-Working Citizens']
const EMOTIONS = ['Anger', 'Nostalgia', 'Fear', 'Pride', 'Hope']

const AUDIENCE_IDS: Record<string, string> = {
  'Concerned Moms': 'concerned-mothers',
  'Disenfranchised Youth': 'disenfranchised-youth',
  'Divorced Men': 'divorced-men',
  'Hard-Working Citizens': 'hard-working-citizens',
}
const EMOTION_IDS: Record<string, string> = {
  'Anger': 'anger',
  'Nostalgia': 'nostalgia',
  'Fear': 'fear',
  'Pride': 'pride',
  'Hope': 'hope',
}

type NodeType = 'welcome' | 'loader' | 'select' | 'success' | 'blob'

interface FlowNode {
  type: NodeType
  headlines?: string[]
  dur?: number
  store?: string
  title?: string
  options?: string[]
  think?: boolean
  sound?: 'ascending' | 'cheer' | 'none'
  landNote?: boolean
  titleXs?: boolean
}

// ?app strips the device chrome for the Pi's 1080×1080 panel (?kiosk kept as alias).
// The exhibit build prints; the web demo shows the Decept on screen instead.
const KIOSK = (() => {
  const q = new URLSearchParams(window.location.search)
  return q.has('app') || q.has('kiosk')
})()

const FLOW: FlowNode[] = [
  { type: 'welcome' },
  { type: 'loader', headlines: ["Great,\nlet's get started!"], dur: 2800, sound: 'cheer' },
  { type: 'select', store: 'audience', title: 'Who do you\nwant to influence?', options: AUDIENCES, landNote: true },
  { type: 'loader', headlines: ['Great choice.'], dur: 2200, sound: 'cheer' },
  { type: 'select', store: 'emotion', title: 'What emotion\nshould we\nmanipulate?', options: EMOTIONS, titleXs: true },
  { type: 'loader', headlines: ["Now we're\ncooking!"], dur: 2200, sound: 'cheer' },
  {
    type: 'loader', think: true, dur: KIOSK ? 22000 : 8000,
    headlines: [
      'Having deep\nstrategic thoughts…',
      'Greenwashing\nthe greenwash…',
      'Confusing feelings\nwith facts…',
      'Thinking of\nworld-first ideas',
      'Outsourcing\nresponsibility…',
      'Cutting down\nsome trees…',
    ]
  },
  { type: 'success' },
  { type: 'blob', dur: 5200, sound: 'none' },
]
const RESET_INDEX = FLOW.findIndex((n) => n.type === 'blob')

const DEBUG = new URLSearchParams(window.location.search).has('debug')

/* ---- sound --------------------------------------------------------- */
// Two sound sets: 'synth' (Web Audio oscillators, the original) and 'samples'
// (loudness-maximised files in public/sounds — much hotter output on the
// Pi's quiet built-in speakers). Toggle persists; switchable from the admin
// panel. Events without a sample file always fall back to synth.
type SoundSet = 'synth' | 'samples'
const SOUND_SET_KEY = 'petro-sound-set'
const Sound = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  // Synth everywhere by default (gains are hot enough for the Pi speaker
  // since the loudness pass). The admin-panel toggle persists and overrides.
  let soundSet: SoundSet = 'synth'
  try {
    const stored = localStorage.getItem(SOUND_SET_KEY)
    if (stored === 'synth' || stored === 'samples') soundSet = stored
  } catch { }
  // Event → file in public/sounds/. Every event is listed: put a filename to
  // play that sample, leave it '' to keep the original synth cue. To try a
  // new sample: drop the raw file in sounds-src/, run
  // scripts/process-sounds.sh, set its name here, then npm run build.
  const SAMPLE_FILES: Record<string, string> = {
    nav: 'selector_sound.wav',       // selector move blip
    select: '',                      // confirm click on a selector
    power: 'startup.mp3',            // power-on chime, welcome screen
    land: '',                        // soft landing tone
    cheer: 'small_celebration.wav',  // short success — loaders after each choice, incl. the first
    loading: 'progress_loop.wav',    // looped under the long "thinking" loader
    success: 'final_success.mp3',    // final success / print fires
    reset: 'small_celebration.wav',  // back-to-start reset
  }
  const buffers: Record<string, AudioBuffer> = {}
  let samplesRequested = false
  const loadSamples = (c: AudioContext) => {
    if (samplesRequested) return
    samplesRequested = true
    // In dev import.meta.url points at /src/ (same gotcha as resolveDecept),
    // so use the public root there; in the build the bundle sits in assets/.
    const base = import.meta.env.DEV
      ? new URL('/sounds/', window.location.origin)
      : new URL('../sounds/', import.meta.url)
    for (const [name, file] of Object.entries(SAMPLE_FILES)) {
      if (!file) continue
      fetch(new URL(file, base))
        .then((r) => r.arrayBuffer())
        .then((b) => c.decodeAudioData(b))
        .then((buf) => { buffers[name] = buf })
        .catch(() => { })
    }
  }
  const ac = () => {
    if (!ctx) {
      try { ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)() } catch { return null }
      master = ctx!.createGain(); master.gain.value = 0.85; master.connect(ctx!.destination)
    }
    if (ctx!.state === 'suspended') ctx!.resume()
    loadSamples(ctx!)
    return ctx
  }
  // Play a sample at full scale. Returns false when unavailable (synth set,
  // file still loading/missing) so callers can fall back to the synth cue.
  const sample = (name: string, dur?: number) => {
    if (soundSet !== 'samples') return false
    const c = ac(); if (!c || !master) return false
    const buf = buffers[name]; if (!buf) return false
    const src = c.createBufferSource(); src.buffer = buf
    if (dur != null) {
      src.loop = dur > buf.duration
      const g = c.createGain()
      const t = c.currentTime
      g.gain.setValueAtTime(1, t + Math.max(0, dur - 0.3))
      g.gain.linearRampToValueAtTime(0.0001, t + dur)
      src.connect(g).connect(master)
      src.start(t); src.stop(t + dur)
    } else {
      src.connect(master)
      src.start()
    }
    return true
  }
  const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
  const tone = (note: number, at: number, dur: number, gain = 0.12, type: OscillatorType = 'triangle') => {
    const c = ac(); if (!c || !master) return
    const t = c.currentTime + at
    const o = c.createOscillator(); o.type = type
    o.frequency.value = mtof(note)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.014)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master)
    o.start(t); o.stop(t + dur + 0.03)
  }
  const stack = (notes: number[], at: number, dur: number, gain?: number, type?: OscillatorType) =>
    notes.forEach((n) => tone(n, at, dur, gain, type))
  const noise = (dur: number, gain: number, cutoff: number) => {
    const c = ac(); if (!c || !master) return
    const t = c.currentTime
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource(); src.buffer = buf
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff
    const g = c.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(lp).connect(g).connect(master)
    src.start(t); src.stop(t + dur)
  }
  return {
    getSet(): SoundSet { return soundSet },
    setSet(s: SoundSet) {
      soundSet = s
      try { localStorage.setItem(SOUND_SET_KEY, s) } catch { }
    },
    nav() { if (sample('nav')) return; noise(0.022, 0.1, 3400); tone(86, 0, 0.05, 0.1, 'sine') },
    select() { if (sample('select')) return; noise(0.04, 0.12, 1800); tone(67, 0, 0.08, 0.15); tone(71, 0.055, 0.1, 0.12) },
    power() { if (sample('power')) return; [60, 64, 67, 72].forEach((n, i) => tone(n, i * 0.075, 0.55, 0.14)) },
    land() { if (sample('land')) return; tone(60, 0, 0.5, 0.15, 'sine') },
    cheer() { if (sample('cheer')) return; tone(72, 0, 0.12, 0.12, 'triangle'); tone(76, 0.1, 0.2, 0.1, 'triangle') },
    loading(dur: number) {
      if (sample('loading', dur)) return
      // "up up up up — pause" motif repeated across the whole wait; each
      // repeat starts a touch higher (capped) so it still reads as progress.
      // Every note doubles a quiet upper octave — the tiny speaker barely
      // reproduces the fundamentals, so the shimmer carries the loudness.
      const motif = [0, 4, 7, 12]
      const gap = 0.34, len = 0.28, cycle = 4 * gap + 2.3
      for (let t0 = 0.3, k = 0; t0 + 4 * gap < dur - 0.5; t0 += cycle, k++) {
        const base = 62 + Math.min(k * 2, 8)
        motif.forEach((n, i) => {
          tone(base + n, t0 + i * gap, len, 0.2, 'triangle')
          tone(base + n + 12, t0 + i * gap, len, 0.06, 'sine')
        })
      }
    },
    success() {
      if (sample('success')) return;
      [[60, 64], [64, 67], [67, 72]].forEach((pair, i) => stack(pair, i * 0.13, 0.26, 0.15))
      stack([60, 64, 67, 72], 0.42, 1.1, 0.12)
    },
    reset() {
      if (sample('reset')) return;
      [[72, 76], [69, 72], [65, 69], [64, 67]].forEach((pair, i) => stack(pair, i * 0.14, 0.34, 0.11))
    },
  }
})()

/* ---- shared bits --------------------------------------------------- */
function PetroArt({ onClick, src, large }: { onClick?: () => void; src?: string; large?: boolean }) {
  return (
    <div className={'petro-art' + (large ? ' large' : '')} onClick={onClick}>
      <img src={src ?? MASCOTS['OILY']} alt="Petro" />
    </div>
  )
}
function Cue({ children, glow }: { children: React.ReactNode; glow?: boolean }) {
  return <div className={'pcue' + (glow ? ' glow' : '')}>{children}</div>
}
function Lines({ text }: { text: string }) {
  return text.split('\n').map((l, i) => (
    <span key={i}>{i > 0 ? <br /> : null}{l}</span>
  ))
}
const ChevL = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 3.5 5 9l6.5 5.5" /></svg>
)
const ChevR = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3.5 13 9l-6.5 5.5" /></svg>
)

/* ---- screens ------------------------------------------------------- */
function WelcomeScreen({ onBegin, mascotSrc }: { onBegin: () => void; mascotSrc?: string }) {
  useEffect(() => { Sound.power() }, [])
  const begin = () => { Sound.select(); onBegin() }
  return (
    <div className="scr scr-fade" onClick={begin}>
      <div className="poweron" aria-hidden="true"><div className="pb" /><div className="pl" /></div>
      <div className="zone-top">
        <div className="headline">Hi, I&rsquo;m Petro.</div>
        <div className="subline">Your automated oil &amp; gas marketer</div>
      </div>
      <div className="zone-mid"><PetroArt src={mascotSrc} /></div>
      <div className="zone-bot">
        <div className="legend">
          <span className="seg"><span className="kg">&#9664;&#8198;&#9654;</span>Browse</span>
          <span className="seg"><span className="kg pulse">&#9650;&#8198;&#9660;</span>Select</span>
        </div>
      </div>
    </div>
  )
}

function LoaderScreen({ node, onDone, mascotSrc, waitFor, largeMascot }: { node: FlowNode; onDone: () => void; mascotSrc?: string; waitFor?: Promise<void> | null; largeMascot?: boolean }) {
  const [p, setP] = useState(0)
  const fillRef = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const cb = useRef(onDone); cb.current = onDone
  const dur = node.dur!
  const headlines = node.headlines!
  useEffect(() => {
    if (node.sound === 'cheer') Sound.cheer()
    else if (node.sound !== 'none') Sound.loading(dur / 1000)
  }, [])
  useEffect(() => {
    let raf: number, hold: ReturnType<typeof setTimeout>
    let start: number | null = null
    let animDone = false
    let printDone = !waitFor
    const tryAdvance = () => { if (animDone && printDone && !done.current) { done.current = true; hold = setTimeout(() => cb.current(), 360) } }
    if (waitFor) waitFor.then(() => { printDone = true; tryAdvance() })
    done.current = false
    const tick = (t: number) => {
      if (start == null) start = t
      const v = Math.min(1, (t - start) / dur)
      setP(v)
      if (fillRef.current) fillRef.current.style.width = v * 100 + '%'
      if (v < 1) { raf = requestAnimationFrame(tick) }
      else { animDone = true; tryAdvance() }
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clearTimeout(hold) }
  }, [dur])
  const hi = Math.min(headlines.length - 1, Math.floor(p * headlines.length))
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline sm" key={hi} style={{ animation: 'petro-fadein .3s ease both' }}>
          <Lines text={headlines[hi]} />
        </div>
      </div>
      <div className="zone-mid"><PetroArt src={mascotSrc} large={largeMascot} /></div>
      <div className="zone-bot">
        <div className="loadbar"><div className="fill" ref={fillRef} /></div>
      </div>
    </div>
  )
}

function SelectScreen({ node, index, onChange, onConfirm, mascotSrc }: {
  node: FlowNode; index: number; onChange: (i: number) => void; onConfirm: () => void; mascotSrc?: string
}) {
  const opts = node.options!
  useEffect(() => { if (node.landNote) Sound.land() }, [])
  const move = (d: number) => { Sound.nav(); onChange((index + d + opts.length) % opts.length) }
  const confirm = () => { Sound.select(); onConfirm() }
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className={`headline sm${node.titleXs ? ' xs' : ''}`}><Lines text={node.title!} /></div>
      </div>
      <div className="zone-mid"><PetroArt onClick={confirm} src={mascotSrc} /></div>
      <div className="zone-bot">
        <div className="selector">
          <button className="chev pulse" onClick={() => move(-1)} aria-label="Previous"><ChevL /></button>
          <div className="value"><span key={index} className="value-fade">{opts[index]}</span></div>
          <button className="chev pulse" onClick={() => move(1)} aria-label="Next"><ChevR /></button>
        </div>
      </div>
    </div>
  )
}

/* Shared reset-bar timing: hold ~2.1s, then a 6.5s bar that flips to the
   "make another" copy at 72% and finally resets. */
function useResetBar(onReset: () => void) {
  const cb = useRef(onReset); cb.current = onReset
  const [showBar, setShowBar] = useState(false)
  const [resetting, setResetting] = useState(false)
  const fillRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    Sound.land()
    const t = setTimeout(() => Sound.success(), 160)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => { const t = setTimeout(() => setShowBar(true), 2100); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (!showBar) return
    let raf: number, start: number | null = null, fired = false
    const dur = 6500
    const tick = (t: number) => {
      if (start == null) start = t
      const v = Math.min(1, (t - start) / dur)
      if (fillRef.current) fillRef.current.style.width = v * 100 + '%'
      if (!fired && v > 0.72) { fired = true; setResetting(true); Sound.reset() }
      if (v < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => cb.current(), 260)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [showBar])
  return { showBar, resetting, fillRef, reset: () => { Sound.select(); cb.current() } }
}

// Kiosk (and web fallback when no artwork resolved): Petro holds the printout.
function SuccessScreen({ onReset, mascotSrc, largeMascot }: { onReset: () => void; mascotSrc?: string; largeMascot?: boolean }) {
  const { showBar, resetting, fillRef, reset } = useResetBar(onReset)
  return (
    <div className="scr scr-fade" onClick={reset}>
      <div className="zone-top">
        <div className={`headline${resetting ? ' sm' : ''}`} key={resetting ? 'r' : 'i'} style={{ animation: 'petro-fadein .3s ease both' }}>
          <Lines text={resetting ? "Let's make some\nmore ideas…" : "Your idea\nis ready"} />
        </div>
      </div>
      <div className="zone-mid"><PetroArt src={mascotSrc} large={largeMascot} /></div>
      <div className="zone-bot">
        {showBar && <div className="loadbar appear"><div className="fill" ref={fillRef} /></div>}
      </div>
    </div>
  )
}

// Web demo: show the generated Decept as large as the screen allows — no
// headline, no auto-reset. Save / start-again buttons below; clicking the
// artwork opens a full-viewport lightbox (portalled past the zoomed window).
function WebSuccessScreen({ onReset, art }: { onReset: () => void; art: string }) {
  const [zoomed, setZoomed] = useState(false)
  useEffect(() => {
    Sound.land()
    const t = setTimeout(() => Sound.success(), 160)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!zoomed) return
    // Capture-phase so Escape closes the lightbox instead of resetting the app
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setZoomed(false) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [zoomed])
  return (
    <div className="scr scr-fade web-success">
      <div className="zone-mid">
        <div className="decept decept-big">
          <img src={art} alt="Your generated Decept" title="Click to enlarge" onClick={() => setZoomed(true)} />
        </div>
      </div>
      <div className="zone-bot">
        <div className="decept-actions">
          <a href={art} download="petro-idea.png" className="decept-dl">↓ Save image</a>
          <button className="decept-dl" onClick={() => { Sound.select(); onReset() }}>↺ Start again</button>
        </div>
      </div>
      {zoomed && createPortal(
        <div className="decept-lightbox" onClick={() => setZoomed(false)} role="dialog" aria-label="Enlarged artwork">
          <img src={art} alt="Your generated Decept" />
        </div>,
        document.body
      )}
    </div>
  )
}

function BlobScreen({ dur, onDone }: { dur: number; onDone: () => void }) {
  const cb = useRef(onDone); cb.current = onDone
  useEffect(() => {
    const t = setTimeout(() => cb.current(), dur)
    return () => clearTimeout(t)
  }, [dur])
  return (
    <div className="scr blob-screen scr-fade">
      <div className="blob" />
      <Cue glow>[ Firing up the rig&hellip; ]</Cue>
    </div>
  )
}

/* ---- admin panel ---------------------------------------------------- */
type NetworkInfo = { ip: string | null; ssid: string | null }
type BluetoothInfo = { paired: boolean; connected: boolean; usingSpeaker: boolean }
type AdminAction = 'printback' | 'sounds' | 'speaker' | 'switch' | 'restart' | 'kill' | 'reboot' | 'shutdown'
const ADMIN_ACTIONS: AdminAction[] = ['printback', 'sounds', 'speaker', 'switch', 'restart', 'kill', 'reboot', 'shutdown']

function AdminPanel({ onClose }: { onClose: () => void }) {
  const [net, setNet] = useState<NetworkInfo>({ ip: null, ssid: null })
  const [bt, setBt] = useState<BluetoothInfo>({ paired: false, connected: false, usingSpeaker: false })
  const [msg, setMsg] = useState<string | null>(null)
  const [sel, setSel] = useState(0)
  const [backCount, setBackCount] = useState(10)
  const [soundSet, setSoundSet] = useState<SoundSet>(Sound.getSet())
  const [version, setVersion] = useState<string | null>(null)

  // dist/VERSION is stamped by scripts/deploy-pi.sh (git sha + commit date).
  // Missing in dev / non-deployed builds — the row just shows '—'.
  useEffect(() => {
    fetch('/VERSION').then(r => r.ok ? r.text() : Promise.reject())
      .then(t => setVersion(t.trim()))
      .catch(() => { })
  }, [])

  // Refs so the single stable keyboard handler always sees current values
  const netRef = useRef(net)
  const selRef = useRef(sel)
  const msgRef = useRef(msg)
  const backCountRef = useRef(backCount)
  const onCloseRef = useRef(onClose)
  useEffect(() => { netRef.current = net }, [net])
  useEffect(() => { selRef.current = sel }, [sel])
  useEffect(() => { msgRef.current = msg }, [msg])
  useEffect(() => { backCountRef.current = backCount }, [backCount])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Poll network status every 2 s
  useEffect(() => {
    let active = true
    const poll = () => {
      fetch('/api/network').then(r => r.json())
        .then(d => { if (active) setNet({ ip: d.ip ?? null, ssid: d.ssid ?? null }) })
        .catch(() => { })
        .finally(() => { if (active) setTimeout(poll, 2000) })
    }
    poll()
    return () => { active = false }
  }, [])

  // Poll Bluetooth speaker status every 2 s
  useEffect(() => {
    let active = true
    const poll = () => {
      fetch('/api/bluetooth/status').then(r => r.json())
        .then(d => { if (active) setBt({ paired: !!d.paired, connected: !!d.connected, usingSpeaker: !!d.usingSpeaker }) })
        .catch(() => { })
        .finally(() => { if (active) setTimeout(poll, 2000) })
    }
    poll()
    return () => { active = false }
  }, [])

  const doSwitch = useCallback(() => {
    if (msgRef.current) return
    const onPrinter = netRef.current.ssid?.startsWith('DIRECT-') ?? false
    const mode = onPrinter ? 'maintenance' : 'printer'
    setMsg(onPrinter ? 'Switching to home WiFi…' : 'Switching to printer WiFi…')
    fetch('/api/network', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
      .then(() => setTimeout(() => setMsg(null), 3000))
      .catch(() => { setMsg('Switch failed'); setTimeout(() => setMsg(null), 3000) })
  }, [])

  const doRestart = useCallback(() => {
    if (msgRef.current) return
    setMsg('Restarting…')
    fetch('/api/admin/restart', { method: 'POST' }).catch(() => { })
    // kiosk dies and restarts — display goes dark then back
  }, [])

  const doKill = useCallback(() => {
    if (msgRef.current) return
    setMsg('Stopping kiosk…')
    fetch('/api/admin/stop', { method: 'POST' }).catch(() => { })
    // kiosk dies — display goes dark, shell is waiting
  }, [])

  const doToggleSpeaker = useCallback(() => {
    if (msgRef.current) return
    if (bt.usingSpeaker) {
      setMsg('Switching to built-in speakers…')
      fetch('/api/bluetooth/builtin', { method: 'POST' })
        .then(() => setTimeout(() => setMsg(null), 3000))
        .catch(() => { setMsg('Switch failed'); setTimeout(() => setMsg(null), 3000) })
    } else {
      setMsg('Connecting speaker…')
      fetch('/api/bluetooth/connect', { method: 'POST' })
        .then(() => setTimeout(() => setMsg(null), 4000))
        .catch(() => { setMsg('Connect failed'); setTimeout(() => setMsg(null), 3000) })
    }
  }, [bt.usingSpeaker])

  const doReboot = useCallback(() => {
    if (msgRef.current) return
    setMsg('Rebooting…')
    fetch('/api/admin/reboot', { method: 'POST' }).catch(() => { })
    // Pi reboots — display goes dark then the kiosk comes back on its own
  }, [])

  const doShutdown = useCallback(() => {
    if (msgRef.current) return
    setMsg('Shutting down…')
    fetch('/api/admin/shutdown', { method: 'POST' }).catch(() => { })
    // Pi powers off — display goes dark for good; wait ~10s before pulling power
  }, [])

  const doPrintBack = useCallback(() => {
    if (msgRef.current) return
    const count = backCountRef.current
    setMsg(`Printing ${count} back page${count === 1 ? '' : 's'}…`)
    fetch('/api/print-back', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    })
      .then(r => r.json())
      .then(d => {
        setMsg(d.ok ? `Sent ${d.count} back page${d.count === 1 ? '' : 's'} to printer` : `Print failed: ${d.error}`)
        setTimeout(() => setMsg(null), 3000)
      })
      .catch(() => { setMsg('Print failed'); setTimeout(() => setMsg(null), 3000) })
  }, [])

  const doToggleSounds = useCallback(() => {
    const next: SoundSet = Sound.getSet() === 'samples' ? 'synth' : 'samples'
    Sound.setSet(next)
    setSoundSet(next)
    Sound.success() // preview the new set
  }, [])

  const HANDLERS: Record<AdminAction, () => void> = useMemo(
    () => ({ printback: doPrintBack, sounds: doToggleSounds, speaker: doToggleSpeaker, switch: doSwitch, restart: doRestart, kill: doKill, reboot: doReboot, shutdown: doShutdown }),
    [doPrintBack, doToggleSounds, doToggleSpeaker, doSwitch, doRestart, doKill, doReboot, doShutdown]
  )
  const handlersRef = useRef(HANDLERS)
  useEffect(() => { handlersRef.current = HANDLERS }, [HANDLERS])

  // Single stable keyboard listener — registered once, uses refs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(ADMIN_ACTIONS.length - 1, s + 1)); return }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (ADMIN_ACTIONS[selRef.current] === 'printback') {
          e.preventDefault()
          const d = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 1)
          setBackCount(c => Math.max(1, Math.min(50, c + d)))
        }
        return
      }
      if (e.key === 'Enter') { e.preventDefault(); handlersRef.current[ADMIN_ACTIONS[selRef.current]](); return }
      const idx = ['1', '2', '3', '4', '5', '6', '7', '8'].indexOf(e.key)
      if (idx !== -1) { e.preventDefault(); handlersRef.current[ADMIN_ACTIONS[idx]]() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPrinterNet = net.ssid?.startsWith('DIRECT-') ?? false
  const switchLabel = onPrinterNet ? 'Switch to home WiFi' : 'Switch to printer WiFi'

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
      <span style={{ color: '#555', minWidth: 64, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ccc', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value ?? '—'}</span>
    </div>
  )

  const btn = (idx: number, label: string, opts: { danger?: boolean; value?: React.ReactNode } = {}) => {
    const { danger = false, value } = opts
    const focused = sel === idx && !msg
    return (
      <button
        onClick={() => HANDLERS[ADMIN_ACTIONS[idx]]()}
        style={{
          width: '100%', padding: '11px 16px', border: 'none', borderRadius: 8,
          background: focused ? (danger ? '#450a0a' : '#0f2640') : '#161616',
          color: danger ? (focused ? '#fca5a5' : '#ef4444') : (focused ? '#e2e8f0' : '#94a3b8'),
          fontSize: 15, textAlign: 'left', cursor: 'pointer',
          outline: focused ? `1.5px solid ${danger ? '#ef4444' : '#3b82f6'}` : '1.5px solid transparent',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
          transition: 'background 0.1s',
        }}
      >
        <span>{label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {value}
          <span style={{ opacity: 0.35, fontSize: 12 }}>{idx + 1}</span>
        </span>
      </button>
    )
  }

  const group = (label: string, children: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#3a3a3a', textTransform: 'uppercase', padding: '0 2px' }}>
        {label}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 440, maxHeight: '92vh', overflowY: 'auto',
        background: '#0d0d0d', borderRadius: 14,
        padding: '26px 26px', display: 'flex', flexDirection: 'column', gap: 16,
        border: '1px solid #1e1e1e',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#444', textTransform: 'uppercase' }}>
          Admin
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {row('Network', net.ssid)}
          {row('IP', net.ip)}
          {row('Build', version)}
          {row('Printer', onPrinterNet
            ? <span style={{ color: '#4ade80' }}>● reachable</span>
            : <span style={{ color: '#555' }}>● not on printer network</span>
          )}
          {row('Speaker', bt.usingSpeaker
            ? <span style={{ color: '#4ade80' }}>● playing on Wonderboom</span>
            : bt.connected
              ? <span style={{ color: '#555' }}>● connected, using built-in</span>
              : bt.paired
                ? <span style={{ color: '#555' }}>● paired, not connected</span>
                : <span style={{ color: '#555' }}>● not paired</span>
          )}
        </div>

        {msg ? (
          <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', padding: '32px 0' }}>{msg}</div>
        ) : (
          <>
            {group('Printer', <>
              {btn(0, 'Print back pages', {
                value: <span style={{ fontFamily: 'monospace', fontSize: 14, color: sel === 0 ? '#93c5fd' : '#64748b' }}>
                  ‹ {backCount} ›
                </span>,
              })}
            </>)}
            {group('Audio', <>
              {btn(1, 'Sound set', {
                value: <span style={{ fontFamily: 'monospace', fontSize: 14, color: sel === 1 ? '#93c5fd' : '#64748b' }}>
                  {soundSet === 'samples' ? 'samples' : 'synth'}
                </span>,
              })}
              {btn(2, bt.usingSpeaker ? 'Switch to built-in speakers' : 'Use Wonderboom speaker')}
            </>)}
            {group('Network', <>
              {btn(3, switchLabel)}
            </>)}
            {group('System', <>
              {btn(4, 'Restart kiosk')}
              {btn(5, 'Kill kiosk → shell', { danger: true })}
              {btn(6, 'Reboot Pi', { danger: true })}
              {btn(7, 'Shut down Pi', { danger: true })}
            </>)}
          </>
        )}

        <div style={{ fontSize: 11, color: '#2a2a2a', textAlign: 'center' }}>
          ↑↓ navigate · ←→ adjust count · Enter select · Esc close
        </div>
      </div>
    </div>
  )
}

/* ---- fit-to-viewport ----------------------------------------------- */
function FitStage({ children, pad = 40 }: { children: React.ReactNode; pad?: number }) {
  const inner = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      const el = inner.current; if (!el) return
      el.style.transform = 'none'
      const w = el.offsetWidth, h = el.offsetHeight
      const scale = Math.min((window.innerWidth - pad) / w, (window.innerHeight - pad) / h)
      const dx = (window.innerWidth - w * scale) / 2
      const dy = (window.innerHeight - h * scale) / 2
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
    }
    fit()
    window.addEventListener('resize', fit)
    const id = setTimeout(fit, 200)
    return () => { window.removeEventListener('resize', fit); clearTimeout(id) }
  }, [pad])
  return (
    <div className="fit-stage">
      <div className="fit-inner" ref={inner}>{children}</div>
    </div>
  )
}

/* ---- web stage: Mac window chrome + zoom for native-res rendering --- */
function WebStage({ children, navHeight = 0 }: { children: React.ReactNode; navHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      if (!ref.current) return
      const totalW = 378 + 3      // content + borders (no inner padding)
      const totalH = 378 + 3 + 36 // content + borders + titlebar
      const scale = Math.min(
        (window.innerWidth - 48) / totalW,
        (window.innerHeight - navHeight - 48) / totalH,
        1.5
      )
      ref.current.style.zoom = String(scale)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [navHeight])
  return (
    <div className="web-stage" style={{ height: `calc(100vh - ${navHeight}px)` }}>
      <div className="web-mac-window" ref={ref}>
        <div className="web-mac-titlebar">
          <span className="mac-close" aria-hidden="true" />
          <span className="mac-stripes" aria-hidden="true" />
          <span className="mac-title">PETRO.APP</span>
          <span className="mac-stripes" aria-hidden="true" />
        </div>
        <div className="web-mac-body">
          <div className="kiosk-glass">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ---- print / decept ------------------------------------------------ */
function comboIds(audienceLabel: string, emotionLabel: string) {
  return {
    audience: AUDIENCE_IDS[audienceLabel] ?? audienceLabel.toLowerCase().replace(/\s+/g, '-'),
    emotion: EMOTION_IDS[emotionLabel] ?? emotionLabel.toLowerCase(),
  }
}

function firePrint(audienceLabel: string, emotionLabel: string): Promise<void> {
  const { audience, emotion } = comboIds(audienceLabel, emotionLabel)
  return fetch('/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience, emotion }),
  }).then(() => { }).catch(() => { })
}

// Web demo only: resolve the pre-generated Decept artwork for this combo.
// Resolve from import.meta.url (always in assets/) so the path works whether
// App is embedded in the product page or the standalone /app/ page.
async function resolveDecept(audienceLabel: string, emotionLabel: string): Promise<string | null> {
  const { audience, emotion } = comboIds(audienceLabel, emotionLabel)
  const base = new URL('../printouts/', import.meta.url)
  try {
    const matrix = await fetch(new URL('matrix.json', base)).then((r) => r.json())
    const file = matrix[`${audience}.${emotion}`] ?? matrix.default
    if (!file) return null
    const url = new URL(file, base).toString()
    await new Promise((res) => { const i = new Image(); i.onload = res; i.onerror = res; i.src = url })
    return url
  } catch { return null }
}

/* ---- poster registry (for debug view) ------------------------------ */
const posterModules = import.meta.glob<string>('./assets/posters/*.png', { eager: true, import: 'default' })
const POSTERS: Record<string, string> = {}
for (const [path, url] of Object.entries(posterModules)) {
  const name = path.match(/\/([^/]+)\.png$/)?.[1]
  if (name) POSTERS[name] = url
}

function DebugPage() {
  const emotions = Object.keys(EMOTION_IDS)
  const audiences = Object.keys(AUDIENCE_IDS)
  const emotionKeys = Object.values(EMOTION_IDS)
  const audienceKeys = Object.values(AUDIENCE_IDS)

  const matrix: Record<string, string> = {
    'divorced-men.fear': 'WIFE', 'divorced-men.nostalgia': 'NEW-PETROL-SMELL',
    'divorced-men.anger': 'POLYESTER-TROUSERS', 'divorced-men.pride': 'MOILBORO-MAN',
    'divorced-men.hope': 'GRETA-SUSTAINABLE-FUEL',
    'concerned-mothers.fear': 'TURBINE-CANCER', 'concerned-mothers.nostalgia': 'CUP-OF-OIL',
    'concerned-mothers.anger': 'EVIL', 'concerned-mothers.pride': 'NATURAL-GAS',
    'concerned-mothers.hope': 'DOLPHIN-PLASTIC',
    'disenfranchised-youth.fear': 'VIRAL-TREND', 'disenfranchised-youth.nostalgia': 'STORIES',
    'disenfranchised-youth.anger': 'POTATO-CLOCK', 'disenfranchised-youth.pride': 'AMERICAN-GIRLS',
    'disenfranchised-youth.hope': 'CLIMATE-APP',
    'hard-working-citizens.fear': 'SUN-COUCH', 'hard-working-citizens.nostalgia': 'SOLAR-FARM',
    'hard-working-citizens.anger': 'GOLF', 'hard-working-citizens.pride': 'NET-ZERO',
    'hard-working-citizens.hope': 'YORKSHIRE-PUDDING',
  }

  const mascotVariants = ['DEFAULT', 'FEAR', 'ANGER', 'NOSTALGIC', 'HOPEFUL', 'PRIDE']

  return (
    <div style={{ fontFamily: 'monospace', padding: 24, background: '#111', color: '#eee', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 8 }}>Petro Debug — Posters</h1>
      <table style={{ borderCollapse: 'collapse', marginBottom: 48 }}>
        <thead>
          <tr>
            <th style={th} />
            {emotions.map((e) => <th key={e} style={th}>{e}</th>)}
          </tr>
        </thead>
        <tbody>
          {audiences.map((aud, ai) => (
            <tr key={aud}>
              <td style={{ ...th, textAlign: 'left' }}>{aud}</td>
              {emotionKeys.map((emo) => {
                const key = `${audienceKeys[ai]}.${emo}`
                const posterName = matrix[key]
                const src = posterName ? POSTERS[posterName] : undefined
                return (
                  <td key={emo} style={{ border: '1px solid #333', padding: 8, textAlign: 'center', verticalAlign: 'top' }}>
                    {src
                      ? <img src={src} alt={posterName} style={{ width: 140, display: 'block', marginBottom: 4 }} />
                      : <div style={{ width: 140, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f66' }}>missing</div>}
                    <div style={{ fontSize: 10, color: '#aaa' }}>{posterName}</div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h1 style={{ marginBottom: 8 }}>Petro Debug — Mascots</h1>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th} />
            {mascotVariants.map((v) => <th key={v} style={th}>{v}</th>)}
          </tr>
        </thead>
        <tbody>
          {(['DIVORCE', 'MUM', 'GOTH', 'WORKER'] as const).map((char) => (
            <tr key={char}>
              <td style={{ ...th, textAlign: 'left' }}>{char}</td>
              {mascotVariants.map((v) => {
                const key = char === 'DIVORCE' && v === 'ANGER' ? 'DAD-ANGER' : `${char}-${v}`
                const src = MASCOTS[key]
                return (
                  <td key={v} style={{ border: '1px solid #333', padding: 8, textAlign: 'center' }}>
                    {src
                      ? <img src={src} alt={key} style={{ height: 120, display: 'block', margin: '0 auto 4px' }} />
                      : <div style={{ width: 80, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f66' }}>missing</div>}
                    <div style={{ fontSize: 10, color: '#aaa' }}>{key}</div>
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <td style={{ ...th, textAlign: 'left' }}>OILY</td>
            {(['OILY', 'OILY-ARTIST', 'OILY-ARTIST-ALT', 'OILY-THUMBS-UP', 'OILY-PRINTING'] as const).map((key) => (
              <td key={key} style={{ border: '1px solid #333', padding: 8, textAlign: 'center' }}>
                {MASCOTS[key]
                  ? <img src={MASCOTS[key]} alt={key} style={{ height: 120, display: 'block', margin: '0 auto 4px' }} />
                  : <div style={{ width: 80, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f66' }}>missing</div>}
                <div style={{ fontSize: 10, color: '#aaa' }}>{key}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
const th: React.CSSProperties = { border: '1px solid #333', padding: '8px 12px', whiteSpace: 'nowrap' }

/* ---- state machine ------------------------------------------------- */
export default function App({ navHeight = 0 }: { navHeight?: number } = {}) {
  if (DEBUG) return <DebugPage />

  const [phase, setPhase] = useState(0)
  const [selIndex, setSelIndex] = useState(0)
  const [sel, setSel] = useState<Record<string, string>>({})
  const [art, setArt] = useState<string | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const phaseRef = useRef(phase); phaseRef.current = phase
  const selIndexRef = useRef(selIndex); selIndexRef.current = selIndex
  const selRef = useRef(sel); selRef.current = sel
  const printPromise = useRef<Promise<void> | null>(null)
  const node = FLOW[phase]

  // Pick a selector's random starting option *before* the phase change renders:
  // doing it in an effect after render briefly flashed the previous phase's
  // index (wrong label + wrong mascot) for one frame.
  const advance = useCallback(() => {
    const next = (phaseRef.current + 1) % FLOW.length
    const n = FLOW[next]
    if (n.type === 'select') setSelIndex(Math.floor(Math.random() * n.options!.length))
    setPhase(next)
  }, [])
  const goReset = useCallback(() => setPhase(RESET_INDEX), [])
  const toStart = useCallback(() => { setArt(null); setSel({}); setPhase(0) }, [])

  const confirm = useCallback(() => {
    const n = FLOW[phaseRef.current]
    if (n.type === 'select') {
      const value = n.options![selIndexRef.current]
      setSel((s) => ({ ...s, [n.store!]: value }))
      if (n.store === 'emotion' && !KIOSK) {
        resolveDecept(selRef.current.audience, value).then(setArt)
      }
    }
    advance()
  }, [advance])

  // Warm the mascot art before the screens that show it, so a selector change
  // never waits on the network: Oily's poses + audience defaults up front,
  // then the chosen audience's emotion variants (during the "Great choice"
  // loader) once an audience is picked.
  useEffect(() => {
    ;['OILY', 'OILY-ARTIST', 'OILY-THUMBS-UP', 'OILY-PRINTING'].forEach((k) => warmImage(MASCOTS[k] ?? ''))
    AUDIENCES.forEach((a) => warmImage(getMascotSrc(a)))
  }, [])
  useEffect(() => {
    if (!sel.audience) return
    EMOTIONS.forEach((e) => warmImage(getMascotSrc(sel.audience, e)))
  }, [sel.audience])

  useEffect(() => {
    // Fire print when the cooking loader starts (the loader before think),
    // so the print is in flight throughout the thinking animation.
    if (KIOSK && FLOW[phase].type === 'loader' && !FLOW[phase].think && FLOW[phase + 1]?.think) {
      printPromise.current = firePrint(selRef.current.audience, selRef.current.emotion)
    }
    if (phase === 0) printPromise.current = null
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (adminOpen) return
      // Escape always returns to the very start of the experience
      if (e.key === 'Escape') { e.preventDefault(); Sound.select(); toStart(); return }
      const n = FLOW[phaseRef.current]
      const enter = e.key === 'Enter' || e.key === ' '
      // Up / Down act as Select everywhere, same as Return
      const select = enter || e.key === 'ArrowUp' || e.key === 'ArrowDown'
      if (n.type === 'welcome') {
        // Any key starts the experience (ignore bare modifiers + admin combo)
        if (e.ctrlKey || e.metaKey || e.altKey) return
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return
        e.preventDefault(); Sound.select(); advance()
      } else if (n.type === 'select') {
        if (e.key === 'ArrowLeft') { e.preventDefault(); Sound.nav(); setSelIndex((x) => (x - 1 + n.options!.length) % n.options!.length) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); Sound.nav(); setSelIndex((x) => (x + 1) % n.options!.length) }
        else if (select) { e.preventDefault(); Sound.select(); confirm() }
      } else if (n.type === 'success') {
        if (select) { e.preventDefault(); Sound.select(); goReset() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, confirm, goReset, toStart, adminOpen])

  // Ctrl+Shift+M — admin panel toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        setAdminOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // kiosk: reset after 2 minutes of inactivity on a selector
  useEffect(() => {
    if (FLOW[phase].type !== 'select') return
    let t = setTimeout(goReset, 240000)
    const bump = () => { clearTimeout(t); t = setTimeout(goReset, 240000) }
    window.addEventListener('keydown', bump)
    window.addEventListener('pointerdown', bump)
    window.addEventListener('touchstart', bump)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('touchstart', bump)
    }
  }, [phase, goReset])

  // Resolve which mascot image to show at the current phase
  let mascotSrc = MASCOTS['OILY'] ?? ''
  if (node.type === 'success' && KIOSK) {
    mascotSrc = MASCOTS['OILY-PRINTING'] ?? MASCOTS['OILY'] ?? ''
  } else if (node.type === 'select' && node.store === 'audience') {
    mascotSrc = getMascotSrc(node.options![selIndex])
  } else if (node.type === 'select' && node.store === 'emotion') {
    mascotSrc = getMascotSrc(sel.audience, node.options![selIndex])
  } else if (node.type === 'loader' && node.think) {
    mascotSrc = MASCOTS['OILY-ARTIST'] ?? MASCOTS['OILY'] ?? ''
  } else if (node.type === 'loader' && node.sound === 'cheer') {
    mascotSrc = MASCOTS['OILY-THUMBS-UP'] ?? MASCOTS['OILY'] ?? ''
  } else if (sel.audience && sel.emotion) {
    mascotSrc = getMascotSrc(sel.audience, sel.emotion)
  } else if (sel.audience) {
    mascotSrc = getMascotSrc(sel.audience)
  }

  let screen: React.ReactNode
  if (node.type === 'welcome') screen = <WelcomeScreen onBegin={advance} mascotSrc={mascotSrc} />
  else if (node.type === 'loader') screen = <LoaderScreen key={'s' + phase} node={node} onDone={advance} mascotSrc={mascotSrc} waitFor={node.think ? printPromise.current : null} largeMascot={node.think} />
  else if (node.type === 'select') screen = <SelectScreen node={node} index={selIndex} onChange={setSelIndex} onConfirm={confirm} mascotSrc={mascotSrc} />
  else if (node.type === 'success') screen = (!KIOSK && art)
    ? <WebSuccessScreen onReset={goReset} art={art} />
    : <SuccessScreen onReset={goReset} mascotSrc={mascotSrc} largeMascot={KIOSK} />
  else screen = <BlobScreen key={'s' + phase} dur={node.dur!} onDone={toStart} />

  const inner = <><div className="crt-flash" key={'f' + phase} />{screen}</>

  if (KIOSK) {
    return (
      <div className="petro-kiosk">
        <FitStage pad={0}>
          <div className="kiosk-glass">{inner}</div>
        </FitStage>
        {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      </div>
    )
  }

  return (
    <>
      <WebStage navHeight={navHeight}>{inner}</WebStage>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </>
  )
}
