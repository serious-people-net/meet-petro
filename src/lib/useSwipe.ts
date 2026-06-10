import { useRef } from 'react'

// Horizontal swipe detection for the touch display.
// Returns handlers to spread onto the stage element.
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null)

  return {
    onTouchStart(e: React.TouchEvent) {
      startX.current = e.touches[0].clientX
    },
    onTouchEnd(e: React.TouchEvent) {
      if (startX.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      startX.current = null
      if (Math.abs(dx) < 60) return
      // Swiping left pulls the next option in, like flicking a carousel.
      if (dx < 0) onLeft()
      else onRight()
    },
  }
}
