'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * El conmutador de la maqueta entre el plano del salón y las tarjetas de mesa.
 *
 * Vive en la URL y no en estado del cliente por dos razones: en la maqueta está **arriba**
 * —junto al buscador— y lo que gobierna está al final de la página, así que el estado
 * tiene que ser de la página y no del componente; y cada alta revalida el árbol, lo que
 * perdería un `useState` justo después de crear una mesa.
 */
export function SeatViewToggle({ base, current }: { base: string; current: 'mapa' | 'tarjetas' }) {
  const t = useT()
  const chip = (clave: 'mapa' | 'tarjetas', texto: ReactNode) => (
    <Link
      aria-current={current === clave ? 'page' : undefined}
      className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] font-medium whitespace-nowrap transition-colors max-[859px]:min-h-11 ${
        current === clave ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'
      }`}
      href={clave === 'mapa' ? base : `${base}?vista=tarjetas`}
    >
      {texto}
    </Link>
  )

  return (
    <div className="flex flex-wrap gap-2">
      {/* En el celular, «mapa» abre la lista de mesas (el plano se arma en la computadora): lo dice así. */}
      {chip('mapa', <><span className="max-[767px]:hidden">{t('Vista de mapa', 'Map view')}</span><span className="min-[768px]:hidden">{t('Lista de mesas', 'Table list')}</span></>)}
      {chip('tarjetas', t('Vista de tarjetas', 'Card view'))}
    </div>
  )
}
