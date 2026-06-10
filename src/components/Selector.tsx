import { AnimatePresence, motion } from 'framer-motion'
import type { Option } from '../data/options'
import { Chevron } from './Chevron'
import { PetroFigure } from './PetroFigure'

// The carousel used by both selector screens: a small caps heading up top,
// the option's illustration in the middle, chevrons + label below.
// Controlled from outside (index lives in the screen) so keyboard,
// touch and swipe all drive the same state.

export function SelectorHeading({ children }: { children: string }) {
  return (
    <p className="font-display text-[40px] uppercase tracking-[0.3em] text-ink">
      {children}
    </p>
  )
}

export function SelectorImage({ option }: { option: Option }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={option.id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
      >
        <PetroFigure src={option.image} size={360} />
      </motion.div>
    </AnimatePresence>
  )
}

export function SelectorControls({
  option,
  direction,
  onPrev,
  onNext,
  onConfirm,
}: {
  option: Option
  direction: 1 | -1
  onPrev: () => void
  onNext: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex w-[760px] items-center justify-between">
      <Chevron direction="left" onPress={onPrev} />
      <button
        type="button"
        className="relative h-[120px] flex-1 overflow-hidden"
        onClick={(e) => {
          e.stopPropagation()
          onConfirm()
        }}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.span
            key={option.id}
            custom={direction}
            initial={{ opacity: 0, x: 36 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 * direction }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center px-2 font-display text-[52px] leading-[1.05] text-ink"
          >
            {option.label}
          </motion.span>
        </AnimatePresence>
      </button>
      <Chevron direction="right" onPress={onNext} />
    </div>
  )
}
