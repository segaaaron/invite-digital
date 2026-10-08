import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * **Las piezas del panel que solo existen en el celular** (7 de octubre, maquetas 1 y 2 del panel móvil).
 * Todas se esconden desde 860 px, donde manda la versión de escritorio. Lo decide el ancho (CSS), nunca
 * el agente del aparato: así una tableta en vertical y un teléfono ven lo mismo a igual ancho.
 */

/** Cuatro cifras en una fila: número grande y su nombre debajo. Sustituye a las tarjetas grandes con icono. */
export function CifrasEnFila({ cifras }: { cifras: readonly { valor: ReactNode; rotulo: string; href?: string }[] }) {
  return (
    <ul className="grid gap-2 min-[860px]:hidden" style={{ gridTemplateColumns: `repeat(${cifras.length}, minmax(0, 1fr))` }}>
      {cifras.map((c) => {
        const dentro = (
          <>
            <span className="block font-display text-[26px] leading-none text-ink [font-variant-numeric:lining-nums_tabular-nums]">{c.valor}</span>
            <span className="mt-1.5 block truncate text-[12px] text-ink-soft">{c.rotulo}</span>
          </>
        )
        const clase = 'flex min-h-[72px] flex-col items-center justify-center rounded-[16px] border border-line-panel bg-white/85 px-1.5 py-2.5 text-center shadow-card'
        return (
          <li key={c.rotulo}>
            {c.href === undefined ? <div className={clase}>{dentro}</div> : <Link className={clase} href={c.href}>{dentro}</Link>}
          </li>
        )
      })}
    </ul>
  )
}

/** El aro de respuestas: porcentaje grande y el desglose en una línea. */
export function AroDeRespuestas({ porcentaje, detalle, href }: { porcentaje: number | null; detalle: string; href?: string }) {
  const p = porcentaje ?? 0
  const dentro = (
    <>
      <svg aria-hidden className="size-16 shrink-0 -rotate-90" viewBox="0 0 42 42">
        <circle cx="21" cy="21" fill="none" r="16" stroke="var(--color-bg-sunken)" strokeWidth="6" />
        <circle cx="21" cy="21" fill="none" pathLength="100" r="16" stroke="var(--color-sage)" strokeDasharray={`${p} ${100 - p}`} strokeLinecap="round" strokeWidth="6" />
      </svg>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[24px] leading-tight text-ink">{porcentaje === null ? 'Sin invitados aún' : `${p} % respondió`}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{detalle}</span>
      </span>
    </>
  )
  const clase = 'mb-3 flex items-center gap-4 rounded-[18px] border border-line-panel bg-white/85 px-4 py-3.5 shadow-card min-[860px]:hidden'
  return href === undefined ? <div className={clase}>{dentro}</div> : <Link className={clase} href={href}>{dentro}</Link>
}

/** «Lo próximo»: una sola tarjeta oscura con lo que toca hacer hoy y su botón. */
export function LoProximo({ titulo, detalle, accion, href }: { titulo: string; detalle?: string; accion: string; href: string }) {
  return (
    <section aria-label="Lo próximo" className="mb-3 flex flex-col gap-3 rounded-[20px] bg-shell-deep p-4.5 text-shell-ink shadow-card min-[860px]:hidden">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold-light uppercase">Lo próximo</p>
      <p className="font-display text-[23px] leading-tight">{titulo}</p>
      {detalle === undefined ? null : <p className="-mt-1.5 text-[13px] leading-snug opacity-75">{detalle}</p>}
      <Link className="flex min-h-12 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold px-5 text-[14px] font-medium text-shell-deep" href={href}>
        {accion}
      </Link>
    </section>
  )
}

/** La acción principal flotando sobre la barra de abajo, al alcance del pulgar («+ Añadir»). */
export function BotonFlotante({ href, children, etiqueta }: { href: string; children: ReactNode; etiqueta?: string }) {
  return (
    <Link
      aria-label={etiqueta}
      className="fixed right-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 min-[768px]:bottom-6 flex min-h-13 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-white shadow-[0_14px_30px_-10px_rgb(0_0_0/0.55)] min-[860px]:hidden print:hidden"
      href={href}
    >
      {children}
    </Link>
  )
}
