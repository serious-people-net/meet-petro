import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import oilcanUrl from '../assets/mascots/OILY.png'
import thumbsUrl from '../assets/mascots/OILY-THUMBS-UP.png'
import artistUrl from '../assets/mascots/OILY-ARTIST-LARGE.png'
import printingUrl from '../assets/mascots/OILY-PRINTING-LARGE.png'

/* audience mascots — three distinct characters + emotions, cycled on
   the "target easy audiences" slide */
import mumUrl from '../assets/mascots/MUM-HOPEFUL.png'
import workerUrl from '../assets/mascots/WORKER-ANGER.png'
import gothUrl from '../assets/mascots/GOTH-FEAR.png'

const SLIDE_MS = 10_000

/* All copy is lifted verbatim from the product page. One consistent
   treatment: Petro on the left, text on the right, in a 16:9 Mac-II
   window (title inside, as on the site). Accents highlight key words. */
type Slide = {
  window: string
  title: React.ReactNode
  body: string
  img?: string
  imgClass?: string
  rotate?: string[]
}

const SLIDES: Slide[] = [
  {
    window: 'Petro.app',
    title: <><span className="accent">Deceipt. Delay Deception.</span> Petro makes it fun&nbsp;and&nbsp;easy</>,
    body: 'Petro is an automated oil and gas marketer that helps your clients keep on drilling.',
    img: oilcanUrl,
  },
  {
    window: 'Petro.app',
    title: <>Take the science out of <span className="accent">&quot;conscience&quot;</span></>,
    body: 'Tired of staff walkouts and “moral objections”? Petro never wavers, never doubts, and never asks to see the science.',
    img: thumbsUrl,
  },
  {
    window: 'TRAINING_DATA.TXT',
    title: <>Trained on the <span className="accent">classics</span></>,
    body: 'Trained on decades of deception by Advertising and PR firms, Petro learns from the best.',
    img: artistUrl,
    imgClass: 'is-artist',
  },
  {
    window: 'CONTROLS.SIT',
    title: <>Target <span className="accent">easy</span> audiences</>,
    body: 'Simply choose the audience and emotion you want to manipulate. Petro handles the psyops.',
    rotate: [mumUrl, workerUrl, gothUrl],
  },
  {
    window: 'OUTPUT.DECEIPT',
    title: <>Say bye to <span className="accent">paperless</span></>,
    body: 'Petro prints his creations onto deluxe 300gsm card. No tree spared.',
    img: printingUrl,
    imgClass: 'is-printing',
  },
]

const variants = {
  enter: { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
}
const transition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }

/* Crossfades through the audience mascots across the slide's on-screen
   time. Advances once per (SLIDE_MS / count) and stops on the last one,
   so a transition never coincides with the whole slide changing. */
function RotatingPetro({ imgs }: { imgs: string[] }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= imgs.length - 1) return
    const t = setTimeout(() => setN(n + 1), SLIDE_MS / imgs.length)
    return () => clearTimeout(t)
  }, [n, imgs.length])
  return (
    <AnimatePresence mode="wait">
      <motion.img
        key={n}
        src={imgs[n]}
        alt="An audience Petro can target"
        className="d-petro"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      />
    </AnimatePresence>
  )
}

export default function DisplayPage() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % SLIDES.length), SLIDE_MS)
    return () => clearInterval(t)
  }, [])

  const slide = SLIDES[i]

  return (
    <div className="display">
      <div className="d-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            className="d-slide"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <div className="mac-window">
              <div className="mac-titlebar">
                <span className="mac-close" aria-hidden="true" />
                <span className="mac-stripes" aria-hidden="true" />
                <span className="mac-title">{slide.window}</span>
                <span className="mac-stripes" aria-hidden="true" />
              </div>
              <div className="mac-body">
                <div className="d-petro-wrap">
                  {slide.rotate
                    ? <RotatingPetro imgs={slide.rotate} />
                    : <img src={slide.img} alt="Petro" className={`d-petro ${slide.imgClass ?? ''}`} />}
                </div>
                <div className="d-text">
                  <h2>{slide.title}</h2>
                  <p>{slide.body}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
