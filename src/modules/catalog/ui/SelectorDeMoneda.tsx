'use client'

import { useState, type ReactNode } from 'react'

type Props = {
  readonly textos: { readonly bob: string; readonly usd: string; readonly label: string; readonly note: string }
  readonly children: ReactNode
  readonly inicial?: 'bob' | 'usd'
}

/**
 * «Bolivianos / Dólares» sobre las tarjetas de los planes (documento de cambios, V4): el precio
 * principal es en Bs y el selector enseña su equivalente en dólares. No vuelve a pedir nada al
 * servidor: las tarjetas traen los dos precios y el CSS (`group-data-[moneda=usd]/precios`) enseña
 * uno u otro.
 */
export function SelectorDeMoneda({ textos, children, inicial = 'bob' }: Props) {
  // En inglés abre en dólares (9 oct): quien llega desde EE. UU. o Canadá lee el precio en su moneda.
  const [moneda, setMoneda] = useState<'bob' | 'usd'>(inicial)
  const boton = (valor: 'bob' | 'usd', texto: string) => (
    <button
      aria-pressed={moneda === valor}
      className={`rounded-[var(--radius-pill)] px-5 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase transition-colors ${
        moneda === valor ? 'bg-ink text-bg-raised' : 'text-ink-soft'
      }`}
      onClick={() => setMoneda(valor)}
      type="button"
    >
      {texto}
    </button>
  )
  return (
    <div className="group/precios" data-moneda={moneda}>
      <div aria-label={textos.label} className="mx-auto mt-8 flex w-fit gap-1 rounded-[var(--radius-pill)] border border-[var(--color-line)] p-1" role="group">
        {boton('bob', textos.bob)}
        {boton('usd', textos.usd)}
      </div>
      {moneda === 'usd' ? <p className="mt-3 text-center text-[12.5px] text-ink-mute">{textos.note}</p> : null}
      {children}
    </div>
  )
}
