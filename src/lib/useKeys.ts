import { useEffect, useRef } from 'react'
import { actionForKey, type KeyAction } from '../data/keys'
import { unlockAudio } from './sound'

type Handlers = Partial<Record<KeyAction, () => void>>

// Subscribes the active screen to the configured key bindings.
// Handlers live in a ref so listeners aren't re-bound on every render.
export function useKeys(handlers: Handlers, enabled = true) {
  const ref = useRef(handlers)

  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      unlockAudio()
      const action = actionForKey(e.key)
      if (!action) return
      const handler = ref.current[action]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
