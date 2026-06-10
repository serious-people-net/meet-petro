import { motion } from 'framer-motion'

// Carousel arrows. Currently a drawn SVG — swap the <svg> for an <img>
// when the illustrator provides chevron artwork. The hit area is much
// larger than the glyph for the touch display.

export function Chevron({
  direction,
  onPress,
}: {
  direction: 'left' | 'right'
  onPress: () => void
}) {
  return (
    <motion.button
      type="button"
      aria-label={direction === 'left' ? 'Previous' : 'Next'}
      className="flex h-[160px] w-[120px] items-center justify-center text-ink"
      whileTap={{ scale: 0.82 }}
      onClick={(e) => {
        e.stopPropagation()
        onPress()
      }}
    >
      <svg
        width="44"
        height="76"
        viewBox="0 0 44 76"
        fill="none"
        style={{ transform: direction === 'left' ? 'scaleX(-1)' : undefined }}
      >
        <path
          d="M5 5 L38 38 L5 71"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  )
}
