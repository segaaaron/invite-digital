'use client'

import { useState, type ReactNode } from 'react'

/**
 * El conmutador de la maqueta entre el plano del salón y las tarjetas de mesa.
 *
 * Los dos lados existían y se pintaban a la vez, uno debajo del otro: la página crecía a
 * lo largo y había que desplazarse para ver lo que la maqueta enseña alternando.
 */
export function SeatViewToggle({ map, cards }: { map: ReactNode; cards: ReactNode }) {
  const [vista, setVista] = useState<'mapa' | 'tarjetas'>('mapa')

  const boton = (clave: 'mapa' | 'tarjetas', texto: string) => (
    <button
      aria-pressed={vista === clave}
      className={`rounded-full border px-3.5 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase transition-colors ${
        vista === clave ? 'border-gold bg-gold/15 text-ink' : 'border-line text-ink-mute hover:border-gold/50'
      }`}
      onClick={() => setVista(clave)}
      type="button"
    >
      {texto}
    </button>
  )

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap gap-2.5">
        {boton('mapa', 'Vista de mapa')}
        {boton('tarjetas', 'Vista de tarjetas')}
      </div>
      {vista === 'mapa' ? map : cards}
    </div>
  )
}
