import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

// The shared screen anatomy from the design system:
// a top slot, the illustration in the middle, and a bottom slot —
// all kept inside the circle's safe area. Slots fade in with a stagger.

const slot = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0 },
}

export function Screen({
  top,
  middle,
  bottom,
  onTap,
}: {
  top?: ReactNode
  middle?: ReactNode
  bottom?: ReactNode
  onTap?: () => void
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-between px-44 py-36 text-center"
      initial="hidden"
      animate="shown"
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ staggerChildren: 0.12 }}
      onClick={onTap}
    >
      <motion.div
        variants={slot}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex h-[280px] items-end justify-center"
      >
        {top}
      </motion.div>
      <motion.div
        variants={slot}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-1 items-center justify-center"
      >
        {middle}
      </motion.div>
      <motion.div
        variants={slot}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex h-[200px] items-start justify-center"
      >
        {bottom}
      </motion.div>
    </motion.div>
  )
}
