import { Screen } from '../components/Screen'
import {
  SelectorControls,
  SelectorHeading,
  SelectorImage,
} from '../components/Selector'
import { useCarousel } from '../lib/useCarousel'
import type { Option } from '../data/options'
import { useKeys } from '../lib/useKeys'
import { useSwipe } from '../lib/useSwipe'
import { sounds } from '../lib/sound'

// One screen for both carousels (audience, emotion) — pass the heading
// and option list. Keyboard, chevron taps and swipes all drive it.

export function SelectorScreen({
  heading,
  options,
  onSelect,
}: {
  heading: string
  options: Option[]
  onSelect: (option: Option) => void
}) {
  const carousel = useCarousel(options.length)
  const option = options[carousel.index]

  const prev = () => {
    sounds.tick()
    carousel.prev()
  }
  const next = () => {
    sounds.tick()
    carousel.next()
  }
  const confirm = () => {
    sounds.select()
    onSelect(option)
  }

  useKeys({ prev, next, confirm })
  const swipe = useSwipe(next, prev)

  return (
    <div className="absolute inset-0" {...swipe}>
      <Screen
        top={<SelectorHeading>{heading}</SelectorHeading>}
        middle={<SelectorImage option={option} />}
        bottom={
          <SelectorControls
            option={option}
            direction={carousel.direction}
            onPrev={prev}
            onNext={next}
            onConfirm={confirm}
          />
        }
      />
    </div>
  )
}
