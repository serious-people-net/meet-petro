import { useEffect } from 'react'
import { Screen } from '../components/Screen'
import { Title } from '../components/Title'
import { KeyHint } from '../components/KeyHint'
import { PetroFigure } from '../components/PetroFigure'
import { config } from '../data/config'
import { useKeys } from '../lib/useKeys'
import { sounds } from '../lib/sound'

// Brief instruction interstitial — dismisses itself, or any key/tap skips.
// Used before both selectors with different copy and Petro expressions.

export function InstructionScreen({
  title,
  hint,
  image,
  onDone,
}: {
  title: string
  hint: string
  image: string
  onDone: () => void
}) {
  const skip = () => {
    sounds.advance()
    onDone()
  }

  useEffect(() => {
    const t = setTimeout(onDone, config.instructions.autoAdvanceAfter)
    return () => clearTimeout(t)
  }, [onDone])

  useKeys({ confirm: skip, next: skip, prev: skip })

  return (
    <Screen
      onTap={skip}
      top={<Title>{title}</Title>}
      middle={<PetroFigure src={image} />}
      bottom={<KeyHint>{hint}</KeyHint>}
    />
  )
}
