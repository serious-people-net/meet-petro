// petro-device.jsx — physical frames for Petro.
//   <PetroCRT>…screen content…</PetroCRT>        round display only (flow screens)
//   <PetroDevice>…screen content…</PetroDevice>   full machine + keyboard (hero)

function PetroCRT({ children }){
  return (
    <div className="petro-crt">
      <div className="petro-glass">{children}</div>
    </div>
  );
}

function PetroKeyboard(){
  // row shapes only — 'k' key, 'm' modifier (darker), 'sp' spacebar
  const layout = [
    Array(11).fill('k'),
    ['m', ...Array(10).fill('k'), 'm'],
    ['m', ...Array(9).fill('k'), 'm'],
    ['m','m','m','sp','m','m','m','m'],
  ];
  return (
    <div className="petro-keyboard" aria-hidden="true">
      {layout.map((row, ri) => (
        <div className="petro-krow" key={ri}>
          {row.map((k, ki) => (
            <div key={ki}
              className={'petro-key' + (k === 'm' ? ' mod' : '') + (k === 'sp' ? ' sp' : '')}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PetroDevice({ children }){
  return (
    <div className="petro-device">
      <PetroCRT>{children}</PetroCRT>
      <PetroKeyboard />
    </div>
  );
}

Object.assign(window, { PetroCRT, PetroDevice, PetroKeyboard });
