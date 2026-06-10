export function PetroCRT({ children }: { children: React.ReactNode }) {
  return (
    <div className="petro-crt">
      <div className="petro-glass">{children}</div>
    </div>
  )
}

function PetroKeyboard() {
  const layout: Array<Array<'k' | 'm' | 'sp'>> = [
    Array(11).fill('k'),
    ['m', ...Array(10).fill('k'), 'm'],
    ['m', ...Array(9).fill('k'), 'm'],
    ['m', 'm', 'm', 'sp', 'm', 'm', 'm', 'm'],
  ]
  return (
    <div className="petro-keyboard" aria-hidden="true">
      {layout.map((row, ri) => (
        <div className="petro-krow" key={ri}>
          {row.map((k, ki) => (
            <div key={ki} className={
              'petro-key' + (k === 'm' ? ' mod' : '') + (k === 'sp' ? ' sp' : '')
            } />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PetroDevice({ children }: { children: React.ReactNode }) {
  return (
    <div className="petro-device">
      <PetroCRT>{children}</PetroCRT>
      <PetroKeyboard />
    </div>
  )
}
