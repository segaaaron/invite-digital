'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * El conmutador de la maqueta entre los fondos en efectivo y la lista de regalos.
 *
 * Vive en la URL y no en estado del cliente **a propósito**: cada alta y cada reserva
 * revalidan el árbol, y un `useState` volvía solo a los fondos justo después de añadir
 * un regalo —el atelier veía desaparecer lo que acababa de crear—. Además, así el
 * enlace a «la lista» se puede compartir y sobrevive a recargar.
 */
export function RegistryTabs({
  base,
  current,
  funds,
  gifts,
  cuentas,
}: {
  /** La ruta de la vista, sin parámetros. */
  base: string
  current: 'fondos' | 'regalos'
  funds: ReactNode
  gifts: ReactNode
  /** Cuántos hay de cada uno, al lado de su nombre (maqueta E11). */
  cuentas?: { readonly regalos: number; readonly fondos: number }
}) {
  const t = useT()
  // Pestañas subrayadas en latón, la lista primero (maqueta E11).
  const pestana = (clave: 'fondos' | 'regalos', texto: string) => (
    <Link
      aria-current={current === clave ? 'page' : undefined}
      className={`-mb-px flex h-[46px] items-center gap-2 border-b-[1.5px] px-0.5 text-[15px] font-medium whitespace-nowrap no-underline ${
        current === clave ? 'border-gold text-shell-deep' : 'border-transparent text-ink-mute hover:text-shell-deep'
      }`}
      href={clave === 'regalos' ? base : `${base}?vista=fondos`}
    >
      {texto}
      {cuentas === undefined ? null : (
        <span aria-hidden className="text-[12.5px] font-normal text-ink-mute">
          {cuentas[clave]}
        </span>
      )}
    </Link>
  )

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t('Lista y fondos', 'List and funds')} className="flex gap-7 border-b border-line-panel">
        {pestana('regalos', t('Lista de regalos', 'Gift list'))}
        {pestana('fondos', t('Fondos en efectivo', 'Cash funds'))}
      </nav>
      {current === 'fondos' ? funds : gifts}
    </div>
  )
}
