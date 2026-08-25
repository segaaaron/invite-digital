import type { ReactNode } from 'react'

/**
 * Tarjeta de dato, portada del diseño entregado: marfil sobre blanco, borde tenue y una
 * sombra que la separa del fondo.
 *
 * Las cifras van en Cormorant, como la maqueta, con `lining-nums`: sin esa clase la
 * fuente usa números de estilo antiguo —el 1 se lee como I y el 0 como paréntesis— que
 * es lo que llevó a ponerlas en monoespaciada y a alejar el panel de la maqueta. La
 * cifra se lee de reojo; las figuras alineadas la dejan legible sin renunciar al diseño.
 */
export function StatCard({
  label,
  value,
  suffix,
  detail,
  icon,
  progress,
  change,
  tone = 'sage',
}: {
  label: string
  value: string | number
  suffix?: string | undefined
  detail?: string | undefined
  icon?: string | undefined
  /** 0..1. Se recorta: una barra al 140 % se sale de su carril. */
  progress?: number | undefined
  /** La variación de la semana. La dirección va en la flecha, no solo en el color. */
  change?: { direction: 'up' | 'down'; text: string } | undefined
  /** El color de la barra. La maqueta pinta las visitas en violeta y el resto en verde. */
  tone?: 'sage' | 'device' | undefined
}) {
  const filled = progress === undefined ? null : Math.max(0, Math.min(1, progress))

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-line-panel bg-linear-to-b from-bg-top to-white p-5.5 shadow-card transition-shadow hover:shadow-float">
      {/* El filo de luz del borde superior de la maqueta (`.stat::before`). */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent" />
      {icon ? (
        <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-2 text-[80px] opacity-6">
          {icon}
        </span>
      ) : null}
      <p className="font-mono text-[9px] tracking-[0.35em] uppercase text-ink-mute">{label}</p>
      <p className="mt-2 font-display text-[44px] leading-none font-light text-ink [font-variant-numeric:lining-nums]">
        {value}
        {suffix ? <span className="ml-1 text-[18px] text-ink-mute">{suffix}</span> : null}
      </p>
      {change ? (
        <p className={`mt-2 text-[11px] ${change.direction === 'up' ? 'text-sage' : 'text-danger'}`}>
          {change.direction === 'up' ? '↑' : '↓'} {change.text}
        </p>
      ) : null}
      {detail ? <p className="mt-2 text-[11px] text-ink-soft">{detail}</p> : null}
      {filled === null ? null : (
        <div className="mt-3 h-1 overflow-hidden rounded-sm bg-bg-sunken">
          <div
            data-barra
            className={`h-full rounded-sm ${tone === 'device' ? 'bg-device' : 'bg-sage'}`}
            style={{ width: `${filled * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function PanelCard({
  id,
  title,
  action,
  children,
  className = '',
}: {
  /** Ancla, para los enlaces de la barra que llevan a una tarjeta del resumen. */
  id?: string
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-6 rounded-[18px] border border-line-panel bg-linear-to-b from-bg-top to-white p-5.5 shadow-card ${className}`.trim()}
    >
      {title || action ? (
        <div className="mb-4.5 flex flex-wrap items-baseline justify-between gap-4">
          {title ? <h2 className="font-display text-[22px] italic text-ink">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/**
 * Enlace de cabecera de tarjeta: mono diminuta en mayúsculas, como `.panel-head .link`
 * de la maqueta. Vivía escrito a mano en cada vista con clases distintas.
 */
export function PanelCardLink({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-70 hover:opacity-100">{children}</span>
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
          <span className="font-display text-[38px] leading-none font-light text-ink [font-variant-numeric:lining-nums]">{big}</span>
          <span className="mt-0.5 max-w-[130px] text-center font-mono text-[8px] tracking-[0.2em] uppercase text-ink-mute">{caption}</span>
        </div>
      </div>

      <ul className="min-w-[200px] flex-1">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2.5 border-b border-dotted border-line-panel py-2 last:border-none">
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
