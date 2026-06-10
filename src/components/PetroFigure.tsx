import { motion } from 'framer-motion'

// Petro himself. Gently hovers, like he's pleased to see you.

export function PetroFigure({
  src,
  size = 380,
  hover = true,
}: {
  src: string
  size?: number
  hover?: boolean
}) {
  return (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      style={{ width: size, height: size }}
      // multiply sinks the illustration's white background into the paper
      className="object-contain mix-blend-multiply"
      animate={hover ? { y: [0, -12, 0] } : undefined}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
