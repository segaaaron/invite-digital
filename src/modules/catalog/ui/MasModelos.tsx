'use client'

import { Children, useState, type ReactNode } from 'react'

/**
 * La rejilla de modelos de la portada: enseña una tanda y «Ver más» suma la siguiente **en la
 * misma página**, sin navegar. Las tarjetas llegan ya pintadas desde el servidor; aquí solo se
 * decide cuántas se ven.
 */
export function MasModelos({ children, tanda, etiqueta }: { children: ReactNode; tanda: number; etiqueta: string }) {
  const tarjetas = Children.toArray(children)
  const [visibles, setVisibles] = useState(tanda)
  const quedan = tarjetas.length - visibles

  return (
    <>
      <div className="mt-16 grid grid-cols-2 place-items-center gap-x-6 gap-y-14 md:grid-cols-4">
        {tarjetas.slice(0, visibles)}
      </div>

      {quedan > 0 ? (
        <div className="mt-14 flex justify-center">
          <button
            className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-7 py-3 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink transition-colors hover:border-gold"
            onClick={() => setVisibles((n) => n + tanda)}
            type="button"
          >
            {etiqueta}
          </button>
        </div>
      ) : null}
    </>
  )
}
