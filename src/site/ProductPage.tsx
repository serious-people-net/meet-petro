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
    file: 'training_data.txt',
    title: 'Trained on the classics',
    body: 'Decades of lobbying and propaganda, created by the best advertising and PR firms in the business — distilled into one friendly agent.',
  },
  {
    icon: SlidersHorizontal,
    file: 'controls.sit',
    title: 'Pick audience. Pick emotion.',
    body: 'Simply choose the audience and emotion you want to manipulate. Petro handles the strategic thinking.',
  },
  {
    icon: Printer,
    file: 'output.decept',
    title: 'Decepts in seconds',
    body: 'Petro draws and prints an idea in seconds. These print-outs are known as ‘Decepts’.',
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
        <a className="nav-cta" href={DEMO_URL}>Try the demo</a>
      </nav>

      <header className="hero">
        <p className="eyebrow">[ Introducing automated oil &amp; gas marketing ]</p>
        <h1>
          No human should ever have to promote the downfall of the planet they live on.{' '}
          <span className="accent">So we made an agent to do it.</span>
        </h1>
        <p className="hero-sub">
          Petro lets you automate your agency&rsquo;s oil and gas marketing.
          Denial. Delay. Deception. Petro makes it easy.
        </p>
        <div className="hero-actions">
          <a className="btn" href={DEMO_URL}>Meet Petro <ArrowRight aria-hidden="true" /></a>
        </div>
        <HeroDevice />
      </header>

      <section className="statement">
        <MacWindow title="Petro.app">
          <h2>Consciousness, without the conscience.</h2>
          <p>
            No longer will agencies have to deal with staff walk-outs and
            &ldquo;moral objections&rdquo;. Petro never wavers, never doubts,
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
        <p className="invite-sub">We are excited to invite you to try Petro right now, from the comfort of your own browser.</p>
        <a className="btn" href={DEMO_URL}>Try the demo <ArrowRight aria-hidden="true" /></a>
      </section>

      <footer className="site-footer">
        <span>meetpetro.com</span>
        <span className="dot" aria-hidden="true" />
        <span>A Serious People project</span>
      </footer>

    </div>
  )
}
