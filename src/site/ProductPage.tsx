import { ArrowRight, Megaphone, SlidersHorizontal, Printer } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import App from '../App'
import oilcanUrl from '../assets/mascots/OILY.png'

const AFTER_EVENT = new Date() > new Date('2026-07-09T23:59:59')

/* ---- Mac-II-flavoured window chrome --------------------------------- */
function MacWindow({ title, children, className = '' }: {
  title: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`mac-window ${className}`}>
      <div className="mac-titlebar">
        <span className="mac-close" aria-hidden="true" />
        <span className="mac-stripes" aria-hidden="true" />
        <span className="mac-title">{title}</span>
        <span className="mac-stripes" aria-hidden="true" />
      </div>
      <div className="mac-body">{children}</div>
    </div>
  )
}

const FEATURES = [
  {
    icon: Megaphone,
    file: "TRAINING_DATA.TXT",
    title: "Trained on the classics",
    body: "Trained on decades of deception by Advertising and PR firms, Petro learns from the best.",
  },
  {
    icon: SlidersHorizontal,
    file: "CONTROLS.SIT",
    title: "Target easy audiences",
    body: "Simply choose the audience and emotion you want to manipulate. Petro handles the psyops.",
  },
  {
    icon: Printer,
    file: "OUTPUT.TREES",
    title: "Say bye to paperless",
    body: "Petro prints his creations onto deluxe 300gsm card. No tree spared.",
  },
]

export default function ProductPage() {
  const [showDemo, setShowDemo] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const [navH, setNavH] = useState(0)

  useEffect(() => {
    if (navRef.current) setNavH(navRef.current.offsetHeight)
  }, [])

  return (
    <div className="site">

      <nav className="site-nav" ref={navRef}>
        <span className="brand">
          <img src={oilcanUrl} alt="" className="brand-mark" />
          <span className="brand-name">Petro</span>
        </span>
        <div className="nav-right">
          {!AFTER_EVENT && (
            <a className="nav-cta" href="#invite">RSVP</a>
          )}
          {showDemo
            ? <button className="nav-cta nav-back" onClick={() => setShowDemo(false)}>← BACK</button>
            : <button className="nav-cta" onClick={() => setShowDemo(true)}>TRY THE DEMO</button>
          }
        </div>
      </nav>

      {showDemo ? (
        <div className="demo-layer" style={{ top: navH }}>
          <App navHeight={navH} />
        </div>
      ) : (
        <>
          <header className="hero">
            <p className="eyebrow">[ Meet Petro ]</p>
            <h1>
              <span className="accent">Denial. Delay. Deception.</span> Petro makes it fun and easy
            </h1>
            <p className="hero-sub">
              Petro is an automated oil and gas marketer that helps your clients keep on drilling.
            </p>
            <img src={oilcanUrl} alt="Petro" className="hero-petro" />
            <div className="hero-actions">
              <button className="btn" onClick={() => setShowDemo(true)}>
                Meet Petro <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </header>

          <section className="statement">
            <MacWindow title="Petro.app">
              <h2>Take the science out of &quot;conscience&quot;</h2>
              <p>
                Tired of staff walkouts and &ldquo;moral objections&rdquo;? Petro never wavers, never doubts,
                and never asks to see the science.
              </p>
            </MacWindow>
          </section>

          <section className="features">
            {FEATURES.map(({ icon: Icon, file, title, body }) => (
              <MacWindow key={title} title={file} className="feature">
                <Icon className="feature-icon" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{body}</p>
              </MacWindow>
            ))}
          </section>

          {!AFTER_EVENT && (
            <section className="invite" id="invite">
              <p className="eyebrow">[ Demo day ]</p>
              <h2>See the future of fossil fuel marketing for yourself.</h2>
              <p className="invite-sub">Come to our Demo Day on July 9 at Second Home, London.</p>
              <a className="btn" href="#">RSVP <ArrowRight aria-hidden="true" /></a>
            </section>
          )}

          <footer className="site-footer">

            Made by <a href="https://seriouspeople.co" target="_blank" rel="noopener noreferrer">Serious People
            </a>
          </footer>
        </>
      )}

    </div>
  )
}
