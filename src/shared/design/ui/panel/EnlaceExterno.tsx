'use client'

import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * Un enlace que abre otra pestaña y lo dice (sin aviso, quien usa lector se queda sin «atrás»), en el idioma de la
 * página. Del navegador para poder leer el idioma desde componentes que se pintan en los dos lados.
 */
export function EnlaceExterno({ ariaLabel, ariaDescribedBy, className, href, title, children }: { ariaLabel?: string | undefined; ariaDescribedBy?: string | undefined; className: string; href: string; title?: string | undefined; children: ReactNode }) {
  const t = useT()
  const aviso = t('se abre en una pestaña nueva', 'opens in a new tab')
  return (
    <a aria-describedby={ariaDescribedBy} aria-label={ariaLabel === undefined ? undefined : `${ariaLabel} (${aviso})`} className={className} href={href} rel="noopener noreferrer" target="_blank" title={title}>
      {children}
      {ariaLabel === undefined ? (
        <>
          {' '}
          <span className="sr-only">({aviso})</span>
        </>
      ) : null}
    </a>
  )
}
