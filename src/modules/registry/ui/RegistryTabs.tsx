'use client'

import { useState, type ReactNode } from 'react'
import { FilterChip } from '@/shared/design/ui/panel/PanelKit'

/**
 * El conmutador de la maqueta entre los fondos en efectivo y la lista de regalos.
 *
 * Los dos se pintaban a la vez, uno debajo del otro, con los formularios de alta entre
 * medias: la página crecía a lo largo y había que desplazarse para ver lo que la maqueta
 * enseña alternando.
 */
export function RegistryTabs({ funds, gifts }: { funds: ReactNode; gifts: ReactNode }) {
  const [vista, setVista] = useState<'fondos' | 'regalos'>('fondos')

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap gap-2.5">
        <FilterChip active={vista === 'fondos'} onClick={() => setVista('fondos')}>
          Fondos en efectivo
        </FilterChip>
        <FilterChip active={vista === 'regalos'} onClick={() => setVista('regalos')}>
          Lista de regalos
        </FilterChip>
      </div>
      {vista === 'fondos' ? funds : gifts}
    </div>
  )
}
