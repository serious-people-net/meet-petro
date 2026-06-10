import { useState } from 'react'

// Shared carousel state: index + last movement direction (for the slide).
export function useCarousel(length: number) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  return {
    index,
    direction,
    prev() {
      setDirection(-1)
      setIndex((i) => (i - 1 + length) % length)
    },
    next() {
      setDirection(1)
      setIndex((i) => (i + 1) % length)
    },
  }
}
