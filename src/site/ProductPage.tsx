import { ArrowRight, Megaphone, SlidersHorizontal, Printer } from 'lucide-react'
import { PetroDevice } from '../PetroDevice'
import oilcanUrl from '../assets/petro-oilcan-cut.png'

const DEMO_URL = 'app/'

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

/* ---- static device, links into the demo ----------------------------- */
function HeroDevice() {
  return (
    <a className="hero-device" href={DEMO_URL} aria-label="Try the Petro demo">
      <PetroDevice>
        <div className="scr">
          <div className="zone-top">
            <div className="headline">Hi, I&rsquo;m Petro.</div>
            <div className="subline">Your automated oil &amp; gas marketer</div>
          </div>
          <div className="zone-mid">
            <div className="petro-art"><img src={oilcanUrl} alt="" /></div>
          </div>
          <div className="zone-bot">
            <div className="pcue glow">[ Click to try the demo ]</div>
          </div>
        </div>
      </PetroDevice>
    </a>
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
    file: "OUTPUT.DECEIPT",
    title: "Say bye to paperless",
    body: "Petro prints his creations onto deluxe 300gsm card. No tree spared.",
  },
]

export default function ProductPage() {
  return (
    <div className="site">

      <nav className="site-nav">
        <span className="brand">
          <img src={oilcanUrl} alt="" className="brand-mark" />
          <span className="brand-name">Petro</span>
        </span>
        <a className="nav-cta" href={DEMO_URL}>TRY THE DEMO</a>
      </nav>

      <header className="hero">
        <p className="eyebrow">[ Meet Petro ]</p>
        <h1>
          <span className="accent">Deceipt. Delay Deception.</span> Petro makes it fun and easy
        </h1>
        <p className="hero-sub">
          Petro is an automated oil and gas marketer that helps your clients keep on drilling.
        </p>
        <div className="hero-actions">
          <a className="btn" href={DEMO_URL}>Meet Petro <ArrowRight aria-hidden="true" /></a>
        </div>
        <HeroDevice />
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

      <section className="invite">
        <p className="eyebrow">[ Demo day ]</p>
        <h2>See the future of fossil fuel marketing for yourself.</h2>
        <p className="invite-sub">Come to our Demo Day on the 9th July at [Location].</p>
        <a className="btn" href={DEMO_URL}>RSVP <ArrowRight aria-hidden="true" /></a>
      </section>

      <footer className="site-footer">
        <span>Made by Serious People</span>
      </footer>

    </div>
  )
}
