// petro-screens.jsx — Petro setup-assistant screens.
// One design language: a line up top / Petro centred / a cue (or control) below,
// all equidistant. Same oil-can art (placeholder) at one consistent size.
const { useState, useEffect, useRef } = React;
const OILCAN = 'assets/petro-oilcan-cut.png';

/* ---- shared bits ---------------------------------------------------- */

function PetroArt() {
  return (
    <div className="petro-art">
      <img src={OILCAN} alt="Petro, a smiling oil drum" />
    </div>);
}

function Cue({ children, glow }) {
  return <div className={'pcue' + (glow ? ' glow' : '')}>{children}</div>;
}

const ChevL = () =>
<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"
strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 3.5 5 9l6.5 5.5" /></svg>;

const ChevR = () =>
<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"
strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3.5 13 9l-6.5 5.5" /></svg>;

// looping progress fill, driven straight to the DOM (returns [progress, ref])
function useFill(dur = 4200, hold = 600) {
  const [p, setP] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let raf, start = null;
    const tick = (t) => {
      if (start == null) start = t;
      const e = (t - start) % (dur + hold);
      const v = Math.min(1, e / dur);
      setP(v);
      if (ref.current) ref.current.style.width = v * 100 + '%';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dur, hold]);
  return [p, ref];
}

/* ---- 01 · WELCOME --------------------------------------------------- */
function ScreenWelcome() {
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline">Hi, I&rsquo;m Petro.</div>
        <div className="subline">Your automated oil &amp; gas marketer</div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <Cue glow>[ Press return to begin ]<span className="blink"></span></Cue>
      </div>
    </div>);
}

/* ---- 02 · QUICK MESSAGE (app loading) ------------------------------- */
function ScreenLoading() {
  const [, fillRef] = useFill(3400, 500);
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline sm">Great,<br />let&rsquo;s get started!</div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <div className="loadbar"><div className="fill" ref={fillRef}></div></div>
        <Cue glow>[ Firing up the rig&hellip; ]</Cue>
      </div>
    </div>);
}

/* ---- 03 · SELECTOR -------------------------------------------------- */
const AUDIENCES = ['Concerned Moms', 'Disenfranchised Youth', 'Divorced Men', 'Hard-Working Citizens'];

function ScreenSelector() {
  const [i, setI] = useState(0);
  const move = (d) => setI((n) => (n + d + AUDIENCES.length) % AUDIENCES.length);
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline sm">Who do you<br />want to influence?</div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <div className="selector">
          <button className="chev pulse" onClick={() => move(-1)} aria-label="Previous"><ChevL /></button>
          <div className="value"><span key={i} className="value-fade">{AUDIENCES[i]}</span></div>
          <button className="chev pulse" onClick={() => move(1)} aria-label="Next"><ChevR /></button>
        </div>
      </div>
    </div>);
}

/* ---- 04 · THINKING (generating idea) -------------------------------- */
const THOUGHTS = [
'Having deep\nstrategic thoughts…',
'Thinking of\nworld-first ideas',
'Cutting down\nsome trees…'];

function ScreenThinking() {
  const [p, fillRef] = useFill(5400, 700);
  const idx = Math.min(THOUGHTS.length - 1, Math.floor(p * THOUGHTS.length));
  const lines = THOUGHTS[idx].split('\n');
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline sm" key={idx} style={{ animation: 'petro-fadein .3s ease both' }}>
          {lines[0]}<br />{lines[1]}
        </div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <div className="loadbar"><div className="fill" ref={fillRef}></div></div>
      </div>
    </div>);
}

/* ---- 05 · SUCCESS --------------------------------------------------- */
function ScreenSuccess() {
  return (
    <div className="scr scr-fade">
      <div className="zone-top">
        <div className="headline">Your idea<br />is ready</div>
      </div>
      <div className="zone-mid"><PetroArt /></div>
      <div className="zone-bot">
        <Cue glow>[ Press return to start again ]<span className="blink"></span></Cue>
      </div>
    </div>);
}

Object.assign(window, {
  PetroArt, Cue, useFill,
  ScreenWelcome, ScreenLoading, ScreenSelector, ScreenThinking, ScreenSuccess
});
