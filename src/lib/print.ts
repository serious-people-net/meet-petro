import { config, isDemoForced } from '../data/config'

// Looks up which printout a combination produces, and either asks the
// Flask server to print it (gallery) or returns its URL for display (demo).

type Matrix = Record<string, string>

let matrix: Matrix | null = null

export async function loadMatrix(): Promise<Matrix> {
  if (matrix) return matrix
  const res = await fetch('./printouts/matrix.json')
  matrix = (await res.json()) as Matrix
  return matrix
}

export function printoutFor(audienceId: string, emotionId: string): string {
  const m = matrix ?? {}
  const file = m[`${audienceId}.${emotionId}`] ?? m['default'] ?? ''
  return `./printouts/${file}`
}

export interface PrintResult {
  // URL of the artwork to display when nothing was physically printed.
  demoImage: string | null
}

export async function requestPrint(
  audienceId: string,
  emotionId: string,
): Promise<PrintResult> {
  const image = printoutFor(audienceId, emotionId)
  if (isDemoForced()) return { demoImage: image }
  try {
    const res = await fetch(config.print.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: audienceId, emotion: emotionId }),
    })
    if (!res.ok) throw new Error(`print endpoint returned ${res.status}`)
    return { demoImage: null }
  } catch {
    // No server (local dev, GitHub Pages) — fall back to showing the image.
    return { demoImage: image }
  }
}
