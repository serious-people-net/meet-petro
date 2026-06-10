import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Screen } from '../components/Screen'
import { Title } from '../components/Title'
import { ProgressBar } from '../components/ProgressBar'
import { PetroFigure } from '../components/PetroFigure'
import { copy } from '../data/copy'
import { config } from '../data/config'
import { petroStates } from '../data/petro'

// Petro "works". The bar fills unevenly on a fixed schedule — long
// thoughtful pauses, sudden bursts — while the caption cycles through
// the phases. Runs on a timer; the real lookup is instant.

interface Beat {
  at: number // fraction of total duration
  progress: number // 0–1 bar fill
  phase: number // caption index
}

const beats: Beat[] = [
  { at: 0, progress: 0.04, phase: 0 },
  { at: 0.12, progress: 0.22, phase: 0 },
  { at: 0.2, progress: 0.27, phase: 1 },
  { at: 0.42, progress: 0.34, phase: 1 },
  { at: 0.5, progress: 0.61, phase: 2 },
  { at: 0.68, progress: 0.66, phase: 3 },
  { at: 0.82, progress: 0.93, phase: 3 },
  { at: 0.93, progress: 1, phase: 3 },
]

export function GeneratingScreen({ onDone }: { onDone: () => void }) {
  const [beat, setBeat] = useState(beats[0])

  useEffect(() => {
    const total = config.generating.duration
    const timers = beats.map((b) =>
      setTimeout(() => setBeat(b), b.at * total),
    )
    timers.push(setTimeout(onDone, total))
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <Screen
      top={
        <AnimatePresence mode="wait">
          <motion.div
            key={beat.phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Title size="sm">{copy.generating.phases[beat.phase]}</Title>
          </motion.div>
        </AnimatePresence>
      }
      middle={<PetroFigure src={petroStates.working} />}
      bottom={<ProgressBar progress={beat.progress} />}
    />
  )
}
