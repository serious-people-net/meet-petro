// Timings and behaviour. All durations in milliseconds.

export const config = {
  boot: {
    duration: 2600, // circle fill time
    holdAfter: 900, // pause on the full circle before moving on
  },
  instructions: {
    autoAdvanceAfter: 4000, // instruction screens dismiss themselves
  },
  generating: {
    duration: 9000, // total theatrical loading time
  },
  success: {
    autoResetAfter: 20000, // return to intro if nobody presses a key
  },
  print: {
    endpoint: '/api/print',
  },
} as const

// Demo mode: instead of printing, the success screen shows the generated
// artwork. Forced with ?demo in the URL; otherwise it switches on
// automatically when the print endpoint isn't reachable (e.g. GitHub Pages).
export function isDemoForced(): boolean {
  return new URLSearchParams(window.location.search).has('demo')
}
