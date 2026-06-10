// The bracketed terminal-style instruction, e.g. [PRESS ENTER TO BEGIN].
// One component so the style of every hint can change in one place.

export function KeyHint({ children }: { children: string }) {
  return (
    <p className="max-w-[420px] font-mono text-[28px] font-medium uppercase leading-snug tracking-[0.12em] text-ink-soft">
      [{children}]
    </p>
  )
}
