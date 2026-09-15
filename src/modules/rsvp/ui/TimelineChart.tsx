import type { TimelineBar } from '../domain/timeline'

/**
 * El gráfico de barras por día de la maqueta (`.timeline-chart`). Es CSS puro sobre una
 * fila de `div`: una librería de gráficos para catorce barras pesaría más que la página.
 *
 * Las alturas son relativas al día más alto, no absolutas: con dos respuestas en
 * catorce días el gráfico sigue diciendo cuándo llegaron.
 */
export function TimelineChart({ bars, caption }: { bars: readonly TimelineBar[]; caption: string }) {
  const techo = bars.reduce((max, barra) => Math.max(max, barra.count), 0)

  return (
    <figure className="m-0 mt-3">
      <div
        className="flex h-[120px] items-end gap-1 border-b border-line-panel pb-4.5"
        role="img"
        aria-label={`${caption}. ${bars.map((b) => `${b.day}: ${b.count}`).join('. ')}`}
      >
        {bars.map((barra) => (
          <span key={barra.day} className="flex h-full flex-1 items-end">
            <span
              data-barra
              className="block w-full rounded-t-[4px] bg-linear-to-b from-sage-light to-sage"
              style={{ height: `${techo === 0 ? 0 : (barra.count / techo) * 100}%` }}
            />
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 font-mono text-[9px] tracking-[0.15em] text-ink-mute">
        {bars.map((barra) => (
          <span key={barra.day} className="flex-1 text-center">
            {barra.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 text-[11px] text-ink-mute">{caption}</figcaption>
    </figure>
  )
}
