// Keyboard bindings. Add KeyboardEvent.key values to any action,
// e.g. add ' ' (space) to `confirm` if space should also select.

export const keys = {
  prev: ['ArrowLeft', 'ArrowUp'],
  next: ['ArrowRight', 'ArrowDown'],
  confirm: ['Enter'],
} as const

export type KeyAction = keyof typeof keys

export function actionForKey(key: string): KeyAction | null {
  for (const action of Object.keys(keys) as KeyAction[]) {
    if ((keys[action] as readonly string[]).includes(key)) return action
  }
  return null
}
