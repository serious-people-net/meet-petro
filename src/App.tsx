import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { PetroDevice } from './PetroDevice'

/* ---- mascot image registry ----------------------------------------- */
const mascotModules = import.meta.glob<string>('./assets/OILY_MASCOTS_*.png', { eager: true, import: 'default' })
const MASCOTS: Record<string, string> = {}
for (const [path, url] of Object.entries(mascotModules)) {
  const name = path.match(/OILY_MASCOTS_(.+)\.png$/)?.[1]
  if (name) MASCOTS[name] = url
}

const AUDIENCE_MASCOT: Record<string, string> = {
  'Concerned Moms':        'MUM',
  'Disenfranchised Youth': 'GOTH',
  'Divorced Men':          'DIVORCE',
  'Hard-Working Citizens': 'WORKER',
}
const EMOTION_MASCOT: Record<string, string> = {
  'Anger':     'ANGER',
  'Nostalgia': 'NOSTALGIC',
  'Fear':      'FEAR',
  'Hope':      'HOPEFUL',
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

/* ---- content ------------------------------------------------------- */
const AUDIENCES = ['Concerned Moms', 'Disenfranchised Youth', 'Divorced Men', 'Hard-Working Citizens']
const EMOTIONS  = ['Anger', 'Nostalgia', 'Fear', 'Hope']

const AUDIENCE_IDS: Record<string, string> = {
  'Concerned Moms':        'concerned-mothers',
  'Disenfranchised Youth': 'disenfranchised-youth',
  'Divorced Men':          'divorced-men',
  'Hard-Working Citizens': 'hard-working-citizens',
}
const EMOTION_IDS: Record<string, string> = {
  'Anger':     'anger',
  'Nostalgia': 'nostalgia',
  'Fear':      'fear',
  'Hope':      'hope',
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

const FLOW: FlowNode[] = [
  { type: 'welcome' },
  { type: 'loader', headlines: ["Great,\nlet's get started!"], dur: 2800 },
  { type: 'select', store: 'audience', title: 'Who do you\nwant to influence?', options: AUDIENCES, landNote: true },
  { type: 'loader', headlines: ['Great choice.'], dur: 2200, sound: 'cheer' },
  { type: 'select', store: 'emotion', title: 'What emotion\nshould we\nmanipulate?', options: EMOTIONS, titleXs: true },
  { type: 'loader', headlines: ["Now we're\ncooking!"], dur: 2200, sound: 'cheer' },
  { type: 'loader', think: true, dur: 5000,
    headlines: ['Having deep\nstrategic thoughts…', 'Thinking of\nworld-first ideas', 'Cutting down\nsome trees…'] },
  { type: 'success' },
  { type: 'blob', dur: 3200, sound: 'none' },
]
const RESET_INDEX = FLOW.findIndex((n) => n.type === 'blob')

// ?app strips the device chrome for the Pi's 1080×1080 panel (?kiosk kept as alias).
// The exhibit build prints; the web demo shows the Decept on screen instead.
const KIOSK = (() => {
  const q = new URLSearchParams(window.location.search)
  return q.has('app') || q.has('kiosk')
})()

/* ---- sound --------------------------------------------------------- */
const Sound = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  const ac = () => {
    if (!ctx) {
      try { ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)() } catch { return null }
      master = ctx!.createGain(); master.gain.value = 0.85; master.connect(ctx!.destination)
    }
    if (ctx!.state === 'suspended') ctx!.resume()
    return ctx
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
    nav()    { noise(0.022, 0.04, 3400); tone(86, 0, 0.05, 0.04, 'sine') },
    select() { noise(0.04, 0.05, 1800); tone(67, 0, 0.08, 0.06); tone(71, 0.055, 0.1, 0.05) },
    power()  { [60, 64, 67, 72].forEach((n, i) => tone(n, i * 0.075, 0.55, 0.055)) },
    land()   { tone(60, 0, 0.5, 0.06, 'sine') },
    cheer()  { tone(72, 0, 0.12, 0.05, 'triangle'); tone(76, 0.1, 0.2, 0.04, 'triangle') },
    loading(dur: number) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
      const step = 0.42
      const steps = Math.min(scale.length, Math.max(3, Math.round((dur - 0.2) / step)))
      for (let i = 0; i < steps; i++) tone(60 + scale[i], 0.1 + i * step, 0.32, 0.02, 'sine')
    },
    success() {
      [[60, 64], [64, 67], [67, 72]].forEach((pair, i) => stack(pair, i * 0.13, 0.26, 0.06))
      stack([60, 64, 67, 72], 0.42, 1.1, 0.05)
    },
    reset() {
      [[72, 76], [69, 72], [65, 69], [64, 67]].forEach((pair, i) => stack(pair, i * 0.14, 0.34, 0.045))
    },
  }
})()

/* ---- shared bits --------------------------------------------------- */
function PetroArt({ onClick, src }: { onClick?: () => void; src?: string }) {
  return (
    <div className="petro-art" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
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
          <span className="seg"><span className="kg ret pulse">&#8629;</span>Select</span>
        </div>
      </div>
    </div>
  )
}

function LoaderScreen({ node, onDone, mascotSrc }: { node: FlowNode; onDone: () => void; mascotSrc?: string }) {
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
    done.current = false
    const tick = (t: number) => {
      if (start == null) start = t
      const v = Math.min(1, (t - start) / dur)
      setP(v)
      if (fillRef.current) fillRef.current.style.width = v * 100 + '%'
      if (v < 1) { raf = requestAnimationFrame(tick) }
      else if (!done.current) { done.current = true; hold = setTimeout(() => cb.current(), 360) }
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
      <div className="zone-mid"><PetroArt src={mascotSrc} /></div>
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

function SuccessScreen({ onReset, art, mascotSrc }: { onReset: () => void; art?: string | null; mascotSrc?: string }) {
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
  const reset = () => { Sound.select(); cb.current() }
  return (
    <div className="scr scr-fade" onClick={reset}>
      <div className="zone-top">
        <div className={`headline${resetting ? ' sm' : ''}`} key={resetting ? 'r' : 'i'} style={{ animation: 'petro-fadein .3s ease both' }}>
          <Lines text={resetting ? "Let's make some\nmore ideas…" : "Your idea\nis ready"} />
        </div>
      </div>
      <div className="zone-mid">
        {art
          ? <div className="decept"><img src={art} alt="Your generated Decept" /></div>
          : <PetroArt src={mascotSrc} />}
      </div>
      <div className="zone-bot">
        {showBar && <div className="loadbar appear"><div className="fill" ref={fillRef} /></div>}
      </div>
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

/* ---- fit-to-viewport ----------------------------------------------- */
function FitStage({ children, pad = 40 }: { children: React.ReactNode; pad?: number }) {
  const inner = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      const el = inner.current; if (!el) return
      el.style.transform = 'none'
      const w = el.offsetWidth, h = el.offsetHeight
      const scale = Math.min((window.innerWidth - pad) / w, (window.innerHeight - pad) / h)
      const dx = (window.innerWidth  - w * scale) / 2
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

/* ---- print / decept ------------------------------------------------ */
function comboIds(audienceLabel: string, emotionLabel: string) {
  return {
    audience: AUDIENCE_IDS[audienceLabel] ?? audienceLabel.toLowerCase().replace(/\s+/g, '-'),
    emotion:  EMOTION_IDS[emotionLabel]   ?? emotionLabel.toLowerCase(),
  }
}

function firePrint(audienceLabel: string, emotionLabel: string) {
  const { audience, emotion } = comboIds(audienceLabel, emotionLabel)
  fetch('/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audience, emotion }),
  }).catch(() => {})
}

// Web demo only: resolve the pre-generated Decept artwork for this combo.
// The app page lives at /app/, the printouts at the site root.
async function resolveDecept(audienceLabel: string, emotionLabel: string): Promise<string | null> {
  const { audience, emotion } = comboIds(audienceLabel, emotionLabel)
  const base = new URL('../printouts/', document.baseURI)
  try {
    const matrix = await fetch(new URL('matrix.json', base)).then((r) => r.json())
    const file = matrix[`${audience}.${emotion}`] ?? matrix.default
    if (!file) return null
    const url = new URL(file, base).toString()
    await new Promise((res) => { const i = new Image(); i.onload = res; i.onerror = res; i.src = url })
    return url
  } catch { return null }
}

/* ---- state machine ------------------------------------------------- */
export default function App() {
  const [phase, setPhase]       = useState(0)
  const [selIndex, setSelIndex] = useState(0)
  const [sel, setSel]           = useState<Record<string, string>>({})
  const [art, setArt]           = useState<string | null>(null)
  const phaseRef    = useRef(phase);    phaseRef.current    = phase
  const selIndexRef = useRef(selIndex); selIndexRef.current = selIndex
  const selRef      = useRef(sel);      selRef.current      = sel
  const node = FLOW[phase]

  const advance = useCallback(() => setPhase((p) => (p + 1) % FLOW.length), [])
  const goReset = useCallback(() => setPhase(RESET_INDEX), [])
  const toStart = useCallback(() => { setArt(null); setPhase(0) }, [])

  const confirm = useCallback(() => {
    const n = FLOW[phaseRef.current]
    if (n.type === 'select') {
      const value = n.options![selIndexRef.current]
      setSel((s) => ({ ...s, [n.store!]: value }))
      if (n.store === 'emotion') {
        if (KIOSK) firePrint(selRef.current.audience, value)
        else resolveDecept(selRef.current.audience, value).then(setArt)
      }
    }
    advance()
  }, [advance])

  useEffect(() => { if (FLOW[phase].type === 'select') setSelIndex(0) }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = FLOW[phaseRef.current]
      const enter = e.key === 'Enter' || e.key === ' '
      if (n.type === 'welcome') {
        if (enter) { e.preventDefault(); Sound.select(); advance() }
      } else if (n.type === 'select') {
        if (e.key === 'ArrowLeft')       { e.preventDefault(); Sound.nav(); setSelIndex((x) => (x - 1 + n.options!.length) % n.options!.length) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); Sound.nav(); setSelIndex((x) => (x + 1) % n.options!.length) }
        else if (enter)                  { e.preventDefault(); Sound.select(); confirm() }
      } else if (n.type === 'success') {
        if (enter) { e.preventDefault(); Sound.select(); goReset() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, confirm, goReset])

  // kiosk: reset after 30s of inactivity on a selector
  useEffect(() => {
    if (FLOW[phase].type !== 'select') return
    let t = setTimeout(goReset, 30000)
    const bump = () => { clearTimeout(t); t = setTimeout(goReset, 30000) }
    window.addEventListener('keydown', bump)
    return () => { clearTimeout(t); window.removeEventListener('keydown', bump) }
  }, [phase, goReset])

  // Resolve which mascot image to show at the current phase
  let mascotSrc = MASCOTS['OILY'] ?? ''
  if (node.type === 'select' && node.store === 'audience') {
    mascotSrc = getMascotSrc(node.options![selIndex])
  } else if (node.type === 'select' && node.store === 'emotion') {
    mascotSrc = getMascotSrc(sel.audience, node.options![selIndex])
  } else if (node.type === 'loader' && node.think) {
    mascotSrc = MASCOTS['OILY-ARTIST'] ?? MASCOTS['OILY'] ?? ''
  } else if (sel.audience && sel.emotion) {
    mascotSrc = getMascotSrc(sel.audience, sel.emotion)
  } else if (sel.audience) {
    mascotSrc = getMascotSrc(sel.audience)
  }

  let screen: React.ReactNode
  if      (node.type === 'welcome') screen = <WelcomeScreen onBegin={advance} mascotSrc={mascotSrc} />
  else if (node.type === 'loader')  screen = <LoaderScreen key={'s' + phase} node={node} onDone={advance} mascotSrc={mascotSrc} />
  else if (node.type === 'select')  screen = <SelectScreen node={node} index={selIndex} onChange={setSelIndex} onConfirm={confirm} mascotSrc={mascotSrc} />
  else if (node.type === 'success') screen = <SuccessScreen onReset={goReset} art={KIOSK ? null : art} mascotSrc={mascotSrc} />
  else                              screen = <BlobScreen key={'s' + phase} dur={node.dur!} onDone={toStart} />

  const inner = <><div className="crt-flash" key={'f' + phase} />{screen}</>

  if (KIOSK) {
    return (
      <div className="petro-kiosk">
        <FitStage pad={0}>
          <div className="kiosk-glass">{inner}</div>
        </FitStage>
      </div>
    )
  }

  return (
    <div className="petro-page">
      <FitStage>
        <PetroDevice>{inner}</PetroDevice>
      </FitStage>
    </div>
  )
}
