// petro-flow.jsx — Petro, the automated oil & gas marketer.
// A self-running gallery kiosk: keyboard-only (◂ ▸ to browse, return to select),
// loaders hand off on their own, and the whole thing resets to the start if a
// visitor walks away. Mounts <PetroApp/> inside the round-CRT machine.

const { useState, useEffect, useRef, useCallback, useLayoutEffect } = React;
const OILCAN = (typeof window !== 'undefined' && window.PETRO_OILCAN) || 'assets/petro-oilcan-cut.png';

/* ---- content ------------------------------------------------------- */
const AUDIENCES = ['Concerned Moms', 'Disenfranchised Youth', 'Divorced Men', 'Hard-Working Citizens'];
const EMOTIONS  = ['Anger', 'Nostalgia', 'Fear', 'Hope'];

const FLOW = [
  { type: 'welcome' },
  { type: 'loader', headlines: ["Great,\nlet's get started!"], statuses: ['Booting up…', 'Loading talking points…'], dur: 2800 },
  { type: 'select', store: 'audience', title: 'Who do you\nwant to influence?', options: AUDIENCES },
  { type: 'loader', headlines: ['Great choice.'], statuses: ['Profiling the demographic…'], dur: 2200 },
  { type: 'select', store: 'emotion', title: 'What emotion\nshould we\nmanipulate?', options: EMOTIONS },
  { type: 'loader', headlines: ["Now we're\ncooking!"], statuses: ['Sharpening the angle…'], dur: 2200 },
  { type: 'loader', think: true, dur: 6400,
    headlines: ['Having deep\nstrategic thoughts…', 'Thinking of\nworld-first ideas', 'Cutting down\nsome trees…'],
    statuses: ['Generating your campaign…'] },
  { type: 'success' },
  { type: 'blob', dur: 3200 },
];
const RESET_INDEX = FLOW.findIndex((n) => n.type === 'blob');

/* ---- sound — a tiny synth voice for Petro (Web Audio, no assets) -----
   Everything is generated live: filtered-noise key clicks plus little
   two-note-at-once chordal melodies (ascending = good news, descending =
   round-again) and a rising arpeggio sweep while things load.            */
const Sound = (() => {
  let ctx = null, master = null;
  const ac = () => {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);   // midi note → Hz
  // one plucked tone with a soft attack + exponential tail
  const tone = (note, at, dur, gain = 0.12, type = 'triangle') => {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(); o.type = type;
    o.frequency.value = typeof note === 'number' ? mtof(note) : note;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  };
  // two (or more) notes sounding together — the chordal bit
  const stack = (notes, at, dur, gain, type) => notes.forEach((n) => tone(n, at, dur, gain, type));
  const noise = (dur, gain, cutoff) => {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(master);
    src.start(t); src.stop(t + dur);
  };
  return {
    // browse — a soft tick with a tiny pitched blip on top
    nav() { noise(0.022, 0.04, 3400); tone(86, 0, 0.05, 0.04, 'sine'); },
    // confirm — click + a quick rising major third (two-note lift)
    select() { noise(0.04, 0.05, 1800); tone(67, 0, 0.08, 0.06); tone(71, 0.055, 0.1, 0.05); },
    // power-on — warm rising major arpeggio C–E–G–C
    power() { [60, 64, 67, 72].forEach((n, i) => tone(n, i * 0.075, 0.55, 0.055)); },
    // rising twinkle that climbs a pentatonic scale across a loader's run
    loading(dur) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      const step = 0.42;
      const steps = Math.min(scale.length, Math.max(3, Math.round((dur - 0.2) / step)));
      for (let i = 0; i < steps; i++) tone(60 + scale[i], 0.1 + i * step, 0.32, 0.02, 'sine');
    },
    // success fanfare — ascending major thirds resolving to a bright chord
    success() {
      [[60, 64], [64, 67], [67, 72]].forEach((pair, i) => stack(pair, i * 0.13, 0.26, 0.06));
      stack([60, 64, 67, 72], 0.42, 1.1, 0.05);
    },
    // round-again — a gentle descending major chord cascade
    reset() {
      [[72, 76], [69, 72], [65, 69], [64, 67]].forEach((pair, i) => stack(pair, i * 0.14, 0.34, 0.045));
    },
  };
})();

/* ---- shared bits --------------------------------------------------- */
function PetroArt({ onClick }) {
  return (
    <div className="petro-art" onClick={onClick} style={onClick ? { cursor: 'pointer' } : null}>
      <img src={OILCAN} alt="Petro, a smiling oil drum" />
    </div>);
}
function Cue({ children, glow }) {
  return <div className={'pcue' + (glow ? ' glow' : '')}>{children}</div>;
}
function Lines({ text }) {
  const ls = text.split('\n');
  return ls.map((l, i) => <React.Fragment key={i}>{i > 0 ? <br /> : null}{l}</React.Fragment>);
}
const ChevL = () =>
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 3.5 5 9l6.5 5.5" /></svg>;
const ChevR = () =>
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3.5 13 9l-6.5 5.5" /></svg>;

// fills 0→1 over `dur`, then calls onDone once (after a short hold so the
// full bar is visible). Returns [progress, ref-for-the-fill-element].
function useFillOnce(dur, onDone) {
  const [p, setP] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);
  const cb = useRef(onDone); cb.current = onDone;
  useEffect(() => {
    let raf, hold, start = null; done.current = false;
    const tick = (t) => {
      if (start == null) start = t;
      const v = Math.min(1, (t - start) / dur);
      setP(v);
      if (ref.current) ref.current.style.width = v * 100 + '%';
      if (v < 1) { raf = requestAnimationFrame(tick); }
      else if (!done.current) { done.current = true; hold = setTimeout(() => cb.current && cb.current(), 360); }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(hold); };
  }, [dur]);
  return [p, ref];
}

/* ---- screens ------------------------------------------------------- */
function WelcomeScreen({ onBegin }) {
  useEffect(() => { Sound.power(); }, []);
  const begin = () => { Sound.select(); onBegin(); };
  return (
    <div className="scr scr-fade" onClick={begin}>
      <div className="poweron" aria-hidden="true"><div className="pb"></div><div className="pl"></div></div>
      <div className="zone-top">
        <div className="headline">Hi, I&rsquo;m Petro.</div>
        <div className="subline">Your automated oil &amp; gas marketer</div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <div className="legend">
          <span className="seg"><span className="kg">&#9664;&#8198;&#9654;</span>Browse</span>
          <span className="seg"><span className="kg ret pulse">&#8629;</span>Select</span>
        </div>
      </div>
    </div>);
}

function LoaderScreen({ node, onDone }) {
  const [p, fillRef] = useFillOnce(node.dur, onDone);
  useEffect(() => { Sound.loading(node.dur / 1000); }, []);
  const hi = Math.min(node.headlines.length - 1, Math.floor(p * node.headlines.length));
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline sm" key={hi} style={{ animation: 'petro-fadein .3s ease both' }}>
          <Lines text={node.headlines[hi]} />
        </div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <div className="loadbar"><div className="fill" ref={fillRef}></div></div>
      </div>
    </div>);
}

function SelectScreen({ node, index, onChange, onConfirm }) {
  const opts = node.options;
  const move = (d) => { Sound.nav(); onChange((index + d + opts.length) % opts.length); };
  const confirm = () => { Sound.select(); onConfirm(); };
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline sm"><Lines text={node.title} /></div>
      </div>
      <div className="zone-mid"><PetroArt onClick={confirm} /></div>
      <div className="zone-bot">
        <div className="selector">
          <button className="chev pulse" onClick={() => move(-1)} aria-label="Previous"><ChevL /></button>
          <div className="value"><span key={index} className="value-fade">{opts[index]}</span></div>
          <button className="chev pulse" onClick={() => move(1)} aria-label="Next"><ChevR /></button>
        </div>
      </div>
    </div>);
}

function SuccessScreen({ onReset }) {
  const cb = useRef(onReset); cb.current = onReset;
  const [showBar, setShowBar] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fillRef = useRef(null);

  useEffect(() => { Sound.success(); }, []);
  // hold on "your idea is ready" for a beat before the slow reset bar appears
  useEffect(() => { const t = setTimeout(() => setShowBar(true), 2100); return () => clearTimeout(t); }, []);
  // once the bar is in, fill it slowly; near the end, hint that we're looping
  useEffect(() => {
    if (!showBar) return;
    let raf, start = null, fired = false; const dur = 6500;
    const tick = (t) => {
      if (start == null) start = t;
      const v = Math.min(1, (t - start) / dur);
      if (fillRef.current) fillRef.current.style.width = v * 100 + '%';
      if (!fired && v > 0.72) { fired = true; setResetting(true); Sound.reset(); }
      if (v < 1) raf = requestAnimationFrame(tick);
      else { const h = setTimeout(() => cb.current && cb.current(), 260); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showBar]);

  const reset = () => { Sound.select(); cb.current && cb.current(); };
  return (
    <div className="scr scr-fade" onClick={reset}>
      <div className="zone-top">
        <div className="headline">Your idea<br />is ready</div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        {showBar ? (
          <React.Fragment>
            <div className="loadbar appear"><div className="fill" ref={fillRef}></div></div>
            {resetting ? <div className="subline reset-hint">Let&rsquo;s make some more ideas&hellip;</div> : null}
          </React.Fragment>
        ) : null}
      </div>
    </div>);
}

function BlobScreen({ dur, onDone }) {
  const cb = useRef(onDone); cb.current = onDone;
  useEffect(() => { Sound.loading(dur / 1000); const t = setTimeout(() => cb.current && cb.current(), dur); return () => clearTimeout(t); }, [dur]);
  return (
    <div className="scr blob-screen scr-fade">
      <div className="blob"></div>
      <Cue glow>[ Firing up the rig&hellip; ]</Cue>
    </div>);
}

/* ---- fit-to-viewport ---------------------------------------------- */
function FitStage({ children }) {
  const inner = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const el = inner.current; if (!el) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      setScale(Math.min((window.innerWidth - 40) / w, (window.innerHeight - 40) / h, 1.15));
    };
    fit();
    window.addEventListener('resize', fit);
    const id = setTimeout(fit, 200); // re-fit after fonts/images settle
    return () => { window.removeEventListener('resize', fit); clearTimeout(id); };
  }, []);
  return (
    <div className="fit-stage">
      <div className="fit-inner" ref={inner} style={{ transform: `scale(${scale})` }}>{children}</div>
    </div>);
}

/* ---- state machine ------------------------------------------------- */
function PetroApp() {
  const [phase, setPhase] = useState(0);
  const [selIndex, setSelIndex] = useState(0);
  const [sel, setSel] = useState({});
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const selIndexRef = useRef(selIndex); selIndexRef.current = selIndex;
  const node = FLOW[phase];

  const advance = useCallback(() => setPhase((p) => (p + 1) % FLOW.length), []);
  const goReset = useCallback(() => setPhase(RESET_INDEX), []);
  const toStart = useCallback(() => setPhase(0), []);

  const confirm = useCallback(() => {
    const n = FLOW[phaseRef.current];
    if (n.type === 'select') setSel((s) => ({ ...s, [n.store]: n.options[selIndexRef.current] }));
    advance();
  }, [advance]);

  // reset the selector cursor each time we enter a selector
  useEffect(() => { if (FLOW[phase].type === 'select') setSelIndex(0); }, [phase]);

  // keyboard — the only input
  useEffect(() => {
    const onKey = (e) => {
      const n = FLOW[phaseRef.current];
      const enter = e.key === 'Enter' || e.key === ' ';
      if (n.type === 'welcome') { if (enter) { e.preventDefault(); Sound.select(); advance(); } }
      else if (n.type === 'select') {
        if (e.key === 'ArrowLeft') { e.preventDefault(); Sound.nav(); setSelIndex((x) => (x - 1 + n.options.length) % n.options.length); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); Sound.nav(); setSelIndex((x) => (x + 1) % n.options.length); }
        else if (enter) { e.preventDefault(); Sound.select(); confirm(); }
      }
      else if (n.type === 'success') { if (enter) { e.preventDefault(); Sound.select(); goReset(); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, confirm, goReset]);

  // kiosk recovery: if a visitor abandons a selector, reset to the start
  useEffect(() => {
    if (FLOW[phase].type !== 'select') return;
    let t = setTimeout(goReset, 30000);
    const bump = () => { clearTimeout(t); t = setTimeout(goReset, 30000); };
    window.addEventListener('keydown', bump);
    return () => { clearTimeout(t); window.removeEventListener('keydown', bump); };
  }, [phase, goReset]);

  let screen;
  if (node.type === 'welcome') screen = <WelcomeScreen onBegin={advance} />;
  else if (node.type === 'loader') screen = <LoaderScreen key={'s' + phase} node={node} onDone={advance} />;
  else if (node.type === 'select') screen = <SelectScreen node={node} index={selIndex} onChange={setSelIndex} onConfirm={confirm} />;
  else if (node.type === 'success') screen = <SuccessScreen onReset={goReset} />;
  else screen = <BlobScreen key={'s' + phase} dur={node.dur} onDone={toStart} />;

  return (
    <FitStage>
      <PetroDevice>
        <div className="crt-flash" key={'f' + phase}></div>
        {screen}
      </PetroDevice>
    </FitStage>);
}

Object.assign(window, { PetroApp });
