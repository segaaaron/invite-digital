import Link from 'next/link'

export type Segment = {
  readonly key: string
  readonly label: string
  readonly href: string
  /** La cifra que va detrás del rótulo. Sin ella el segmento se pinta solo con texto. */
  readonly count?: number | undefined
}

/**
 * Conmutador de vista: dos o tres segmentos dentro de una sola píldora.
 *
 * **No usa `FilterChip` a propósito.** Los chips son píldoras sueltas y en esta pantalla
 * ya hay una fila de ellos filtrando la tabla: dos filas de chips idénticos una encima de
 * otra no dicen cuál cambia *qué se mira* y cuál cambia *qué se enseña de lo que se mira*.
 * Un segmentado —un solo carril, un segmento encendido— se lee como «una cosa o la otra».
 *
 * Vive en la URL, como el resto del estado del panel: cada acción revalida el árbol y
 * remonta el componente, así que un `useState` aquí se perdería justo después de guardar.
 */
export function SegmentedTabs({ label, current, segments }: { label: string; current: string; segments: readonly Segment[] }) {
  return (
    <div
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-line-panel-strong bg-bg-raised p-1"
      role="group"
    >
      {segments.map((segment) => {
        const activo = segment.key === current
        return (
          <Link
            key={segment.key}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-[var(--radius-pill)] px-3.5 py-1.5 font-mono text-[10px] tracking-[0.25em] whitespace-nowrap uppercase transition-colors ${
              activo ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            }`}
            href={segment.href}
          >
            {segment.label}
            {segment.count === undefined ? null : (
              <span className={`ml-2 ${activo ? 'text-white/60' : 'text-ink-mute'}`}>{segment.count}</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
