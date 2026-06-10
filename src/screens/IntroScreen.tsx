import { Screen } from '../components/Screen'
import { Title } from '../components/Title'
import { KeyHint } from '../components/KeyHint'
import { PetroFigure } from '../components/PetroFigure'
import { copy } from '../data/copy'
import { petroStates } from '../data/petro'
import { useKeys } from '../lib/useKeys'
import { sounds } from '../lib/sound'

export function IntroScreen({ onBegin }: { onBegin: () => void }) {
  const begin = () => {
    sounds.advance()
    onBegin()
  }

  useKeys({ confirm: begin })

  return (
    <Screen
      onTap={begin}
      top={
        <div>
          <Title>{copy.intro.title}</Title>
          <div className="mt-3">
            <Title size="sm">{copy.intro.subtitle}</Title>
          </div>
        </div>
      }
      middle={<PetroFigure src={petroStates.greeting} />}
      bottom={<KeyHint>{copy.intro.hint}</KeyHint>}
    />
  )
}
