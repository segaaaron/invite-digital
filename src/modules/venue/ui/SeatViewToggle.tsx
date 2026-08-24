'use client'

import { useState, type ReactNode } from 'react'
import { FilterChip } from '@/shared/design/ui/panel/PanelKit'

/**
 * El conmutador de la maqueta entre el plano del salón y las tarjetas de mesa.
 *
 * Los dos lados existían y se pintaban a la vez, uno debajo del otro: la página crecía a
 * lo largo y había que desplazarse para ver lo que la maqueta enseña alternando.
 */
export function SeatViewToggle({ map, cards }: { map: ReactNode; cards: ReactNode }) {
  const [vista, setVista] = useState<'mapa' | 'tarjetas'>('mapa')

  const boton = (clave: 'mapa' | 'tarjetas', texto: string) => (
    <FilterChip active={vista === clave} onClick={() => setVista(clave)}>
      {texto}
    </FilterChip>
  )

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap justify-end gap-2.5">
        {boton('mapa', 'Vista de mapa')}
        {boton('tarjetas', 'Vista de tarjetas')}
      </div>
      {vista === 'mapa' ? map : cards}
    </div>
  )
}
