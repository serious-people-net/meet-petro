import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { config } from '../data/config'
import { sounds } from '../lib/sound'

// First-load ceremony: a circle draws itself closed, pops, and chimes.
// Purely theatrical — everything is local.

export function BootScreen({ onDone }: { onDone: () => void }) {
  const fillSeconds = config.boot.duration / 1000

  useEffect(() => {
    const chime = setTimeout(() => sounds.success(), config.boot.duration)
    const done = setTimeout(
      onDone,
      config.boot.duration + config.boot.holdAfter,
    )
    return () => {
      clearTimeout(chime)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <motion.svg
        width="260"
        height="260"
        viewBox="0 0 260 260"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1, 1.12, 1] }}
        transition={{
          duration: fillSeconds + 0.4,
          times: [0, 0.86, 0.93, 1],
          ease: 'easeOut',
        }}
      >
        <circle
          cx="130"
          cy="130"
          r="110"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="10"
          opacity="0.12"
        />
        <motion.circle
          cx="130"
          cy="130"
          r="110"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(-90 130 130)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: fillSeconds, ease: 'easeInOut' }}
        />
      </motion.svg>
    </motion.div>
  )
}
