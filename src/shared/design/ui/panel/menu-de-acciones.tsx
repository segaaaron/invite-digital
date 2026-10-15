'use client'

import type { ReactNode } from 'react'
import { DotsIcon } from '@/shared/design/ui/icons'
import { useT } from '@/shared/i18n/idioma-navegador'

/** El «⋯» de cada fila: su etiqueta es lo que buscan las e2e y los lectores de pantalla (`aria-label`, en el idioma de quien mira). */
export function MenuDeAcciones({ children, etiqueta }: { children: ReactNode; etiqueta?: string }) {
  const t = useT()
  return (
    <details className="relative">
      <summary
        aria-label={etiqueta ?? t('Más acciones', 'More actions')}
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full border max-[859px]:size-11 border-line-panel-strong bg-white text-ink-soft shadow-card transition-colors hover:border-ink hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <DotsIcon className="size-4" />
      </summary>
      <div className="absolute top-[calc(100%+8px)] right-0 z-40 flex w-[240px] flex-col gap-0.5 rounded-[16px] border border-line-panel bg-bg-raised p-1.5 shadow-lift [&>*]:w-full">
        {children}
      </div>
    </details>
  )
}

