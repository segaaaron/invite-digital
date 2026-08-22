import type { ReactNode } from 'react'

/**
 * Tarjeta de dato, portada del diseño entregado: marfil sobre blanco, borde tenue y una
 * sombra que la separa del fondo.
 *
 * Las cifras van en monoespaciada y no en Cormorant. Sus números de estilo antiguo hacen
 * que el 1 se lea como I y el 0 como un paréntesis, y estas cifras se miran de reojo. El
 * mismo defecto ya mordió en el modo puerta.
 */
export function StatCard({
  label,
  value,
  suffix,
  detail,
  icon,
  progress,
}: {
  label: string
  value: string | number
  suffix?: string
  detail?: string
  icon?: string
  /** 0..1. Se recorta: una barra al 140 % se sale de su carril. */
  progress?: number
}) {
  const filled = progress === undefined ? null : Math.max(0, Math.min(1, progress))

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-line bg-linear-to-b from-bg-top to-white p-5.5 shadow-card">
      {icon ? (
        <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-2 text-[80px] opacity-6">
          {icon}
        </span>
      ) : null}
      <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-ink-mute">{label}</p>
      <p className="mt-2 font-mono text-[34px] leading-none font-semibold text-ink">
        {value}
        {suffix ? <span className="ml-1 text-[16px] font-normal text-ink-mute">{suffix}</span> : null}
      </p>
      {detail ? <p className="mt-2 text-[11px] text-ink-soft">{detail}</p> : null}
      {filled === null ? null : (
        <div className="mt-3 h-1 overflow-hidden rounded-sm bg-bg-sunken">
          <div className="h-full rounded-sm bg-sage" style={{ width: `${filled * 100}%` }} />
        </div>
      )}
    </div>
  )
}

export function PanelCard({
  title,
  action,
  children,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[18px] border border-line bg-linear-to-b from-bg-top to-white p-5.5 shadow-card">
      {title || action ? (
        <div className="mb-4.5 flex items-baseline justify-between gap-4">
          {title ? <h2 className="font-display text-[22px] italic text-ink">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export type DonutSlice = { readonly label: string; readonly value: number; readonly color: string }

/**
 * Donut de RSVP en SVG en línea. Son arcos sobre un aro: añadir una librería de gráficos
 * para esto sería desproporcionado.
 *
 * Lleva `role="img"` y un `aria-label` que enuncia los valores, porque un gráfico que
 * solo se ve deja fuera a quien no ve.
 */
export function DonutChart({ slices, big, caption }: { slices: readonly DonutSlice[]; big: string; caption: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  let offset = 0

  return (
    <div className="flex flex-wrap items-center gap-5.5">
      <div className="relative size-[150px] shrink-0">
        <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label={`${caption}. ${slices.map((s) => `${s.label}: ${s.value}`).join('. ')}`}>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-bg-sunken)" strokeWidth="6" />
          {total === 0
            ? null
            : slices.map((slice) => {
                const pct = (slice.value / total) * 100
                const dash = `${pct} ${100 - pct}`
                const start = 100 - offset
                offset += pct
                return (
                  <circle
                    key={slice.label}
                    cx="21"
                    cy="21"
                    r="15.9"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="6"
                    strokeDasharray={dash}
                    strokeDashoffset={start}
                  />
                )
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[30px] leading-none font-semibold text-ink">{big}</span>
          <span className="mt-1 font-mono text-[9px] tracking-[0.3em] text-ink-mute">{caption}</span>
        </div>
      </div>

      <ul className="min-w-[200px] flex-1">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2.5 border-b border-dotted border-line py-2 last:border-none">
            <span aria-hidden className="size-3 rounded-[3px]" style={{ background: slice.color }} />
            <span className="flex-1 text-[13px] text-ink">{slice.label}</span>
            <span className="font-mono text-[11px] text-ink-soft">
              {slice.value}
              {total > 0 ? ` (${Math.round((slice.value / total) * 100)}%)` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
