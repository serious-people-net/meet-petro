import { useEffect, useState, type ReactNode } from 'react'

// The physical screen: a fixed 1080×1080 design surface, scaled to fit
// the window. On the Pi (window = exactly 1080×1080) the scale is 1 and
// the round display does the clipping; everywhere else the same circle
// is masked in CSS, so dev and demo show what the gallery sees.
// Add ?square to the URL to inspect the corners the display will clip.

export const STAGE_SIZE = 1080

export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1)
  const round = !new URLSearchParams(window.location.search).has('square')

  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(window.innerWidth, window.innerHeight) / STAGE_SIZE,
      )
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="flex h-full items-center justify-center bg-black">
      <div
        className="relative shrink-0 overflow-hidden bg-paper text-ink"
        style={{
          width: STAGE_SIZE,
          height: STAGE_SIZE,
          transform: `scale(${scale})`,
          borderRadius: round ? '50%' : 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
