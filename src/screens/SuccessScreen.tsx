import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Screen } from '../components/Screen'
import { Title } from '../components/Title'
import { KeyHint } from '../components/KeyHint'
import { PetroFigure } from '../components/PetroFigure'
import { copy } from '../data/copy'
import { config } from '../data/config'
import { petroStates } from '../data/petro'
import { useKeys } from '../lib/useKeys'
import { sounds } from '../lib/sound'

// The idea is ready. In the gallery the printer is doing its thing and
// Petro celebrates; in demo mode the generated artwork is shown instead.
// Any key restarts, or it resets itself after a while.

export function SuccessScreen({
  demoImage,
  onReset,
}: {
  demoImage: string | null
  onReset: () => void
}) {
  const reset = () => {
    sounds.advance()
    onReset()
  }

  useEffect(() => {
    sounds.success()
    const t = setTimeout(onReset, config.success.autoResetAfter)
    return () => clearTimeout(t)
  }, [onReset])

  useKeys({ confirm: reset, next: reset, prev: reset })

  return (
    <Screen
      onTap={reset}
      top={<Title>{copy.success.title}</Title>}
      middle={
        demoImage ? (
          <motion.img
            src={demoImage}
            alt="Your generated idea"
            draggable={false}
            className="h-[390px] border-[5px] border-ink object-contain shadow-[12px_12px_0_rgba(24,20,16,0.12)]"
            initial={{ opacity: 0, scale: 0.92, rotate: -1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        ) : (
          <PetroFigure src={petroStates.success} />
        )
      }
      bottom={<KeyHint>{copy.success.hint}</KeyHint>}
    />
  )
}
