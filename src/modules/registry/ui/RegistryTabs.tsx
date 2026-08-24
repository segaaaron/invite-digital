import Link from 'next/link'
import type { ReactNode } from 'react'

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
}: {
  /** La ruta de la vista, sin parámetros. */
  base: string
  current: 'fondos' | 'regalos'
  funds: ReactNode
  gifts: ReactNode
}) {
  const chip = (clave: 'fondos' | 'regalos', texto: string) => (
    <Link
      aria-current={current === clave ? 'page' : undefined}
      className={`rounded-[var(--radius-pill)] border px-3.5 py-2 font-mono text-[10px] tracking-[0.25em] whitespace-nowrap uppercase transition-colors ${
        current === clave ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink hover:border-ink'
      }`}
      href={clave === 'fondos' ? base : `${base}?vista=regalos`}
    >
      {texto}
    </Link>
  )

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap gap-2.5">
        {chip('fondos', 'Fondos en efectivo')}
        {chip('regalos', 'Lista de regalos')}
      </div>
      {current === 'fondos' ? funds : gifts}
    </div>
  )
}
