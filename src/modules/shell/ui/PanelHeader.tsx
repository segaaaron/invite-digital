import type { ReactNode } from 'react'

/**
 * La cabecera de una página del panel, dentro de la carcasa. Solo el título y sus
 * acciones: la navegación vive en la barra lateral, que es lo que retiró aquella
 * cabecera de botones sueltos que se partía en tres líneas con títulos largos.
 */
export function PanelHeader({
  title,
  kicker,
  meta,
  actions,
}: {
  title: string
  kicker?: string
  meta?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6.5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {kicker ? <p className="font-mono text-[10px] tracking-[0.35em] uppercase opacity-55">{kicker}</p> : null}
        <h1 className="mt-1.5 font-display text-[28px] leading-none font-light text-ink md:text-[38px]">{title}</h1>
        {meta ? <p className="mt-2 text-[12px] text-ink-soft">{meta}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  )
}
