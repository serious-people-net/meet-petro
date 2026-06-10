import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Stage } from './components/Stage'
import { BootScreen } from './screens/BootScreen'
import { IntroScreen } from './screens/IntroScreen'
import { InstructionScreen } from './screens/InstructionScreen'
import { SelectorScreen } from './screens/SelectorScreen'
import { GeneratingScreen } from './screens/GeneratingScreen'
import { SuccessScreen } from './screens/SuccessScreen'
import { audiences, emotions, type Option } from './data/options'
import { copy } from './data/copy'
import { petroStates } from './data/petro'
import { loadMatrix, requestPrint } from './lib/print'

// The whole app is a linear state machine. Boot runs once per page load;
// every reset afterwards returns to the intro.

type ScreenName =
  | 'boot'
  | 'intro'
  | 'audience-intro'
  | 'audience'
  | 'emotion-intro'
  | 'emotion'
  | 'generating'
  | 'success'

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('boot')
  const [audience, setAudience] = useState<Option | null>(null)
  const [demoImage, setDemoImage] = useState<string | null>(null)

  useEffect(() => {
    void loadMatrix()
  }, [])

  const go = useCallback((s: ScreenName) => () => setScreen(s), [])

  const onEmotionPicked = useCallback(
    (emotion: Option) => {
      // Fire the print as the theatre starts — the result (a demo image,
      // or nothing because paper is coming out of a real printer) is
      // ready long before the loading bar finishes.
      if (audience) {
        void requestPrint(audience.id, emotion.id).then((r) =>
          setDemoImage(r.demoImage),
        )
      }
      setScreen('generating')
    },
    [audience],
  )

  return (
    <Stage>
      <AnimatePresence mode="wait">
        {screen === 'boot' && (
          <BootScreen key="boot" onDone={go('intro')} />
        )}
        {screen === 'intro' && (
          <IntroScreen key="intro" onBegin={go('audience-intro')} />
        )}
        {screen === 'audience-intro' && (
          <InstructionScreen
            key="audience-intro"
            title={copy.instructions.title}
            hint={copy.instructions.hint}
            image={petroStates.instructing}
            onDone={go('audience')}
          />
        )}
        {screen === 'audience' && (
          <SelectorScreen
            key="audience"
            heading={copy.audience.heading}
            options={audiences}
            onSelect={(a) => {
              setAudience(a)
              setScreen('emotion-intro')
            }}
          />
        )}
        {screen === 'emotion-intro' && (
          <InstructionScreen
            key="emotion-intro"
            title={copy.emotionIntro.title}
            hint={copy.emotionIntro.hint}
            image={petroStates.instructing}
            onDone={go('emotion')}
          />
        )}
        {screen === 'emotion' && (
          <SelectorScreen
            key="emotion"
            heading={copy.emotion.heading}
            options={emotions}
            onSelect={onEmotionPicked}
          />
        )}
        {screen === 'generating' && (
          <GeneratingScreen key="generating" onDone={go('success')} />
        )}
        {screen === 'success' && (
          <SuccessScreen
            key="success"
            demoImage={demoImage}
            onReset={go('intro')}
          />
        )}
      </AnimatePresence>
    </Stage>
  )
}
