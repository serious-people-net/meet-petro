import { motion } from 'framer-motion'

// The theatrical loading bar: a thin outlined track that fills in
// deliberate, uneven steps — busy thinking, not smooth progress.
// `progress` is 0–1, animated from the generating screen's schedule.

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-[36px] w-[420px] border-[5px] border-ink p-[5px]">
      <motion.div
        className="h-full bg-ink"
        initial={{ width: '0%' }}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      />
    </div>
  )
}
