'use client'

import { useState, type ReactNode } from 'react'

/**
 * Bodas / XV años en la sección de modelos de la portada (9 oct: «la home solo muestra modelos de boda»).
 * Las dos listas llegan pintadas del servidor; aquí solo se elige cuál se ve. Con flechas se pasa de una
 * pestaña a otra, como pide el patrón de pestañas.
 */
export function PestanasDeModelos({ etiqueta, pestanas }: { etiqueta: string; pestanas: readonly { clave: string; nombre: string; contenido: ReactNode }[] }) {
  const [activa, setActiva] = useState(pestanas[0]?.clave ?? '')
  return (
    <>
      <div aria-label={etiqueta} className="mt-10 flex justify-center" role="tablist">
        <div className="inline-flex gap-1 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-bg-raised p-1">
          {pestanas.map((p, i) => (
            <button
              aria-controls={`modelos-${p.clave}`}
              aria-selected={activa === p.clave}
              className={`min-h-11 rounded-[var(--radius-pill)] px-6 text-[12px] tracking-[0.16em] whitespace-nowrap uppercase transition-colors ${
                activa === p.clave ? 'bg-ink text-bg-raised' : 'text-ink-soft hover:text-ink'
              }`}
              id={`pestana-${p.clave}`}
              key={p.clave}
              onClick={() => setActiva(p.clave)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                const siguiente = pestanas[(i + (e.key === 'ArrowRight' ? 1 : pestanas.length - 1)) % pestanas.length]!
                setActiva(siguiente.clave)
                document.getElementById(`pestana-${siguiente.clave}`)?.focus()
              }}
              role="tab"
              tabIndex={activa === p.clave ? 0 : -1}
              type="button"
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </div>
      {pestanas.map((p) => (
        <div aria-labelledby={`pestana-${p.clave}`} hidden={activa !== p.clave} id={`modelos-${p.clave}`} key={p.clave} role="tabpanel">
          {p.contenido}
        </div>
      ))}
    </>
  )
}
