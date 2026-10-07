import type { ReactNode } from 'react'

/**
 * La cabecera de una página del panel, dentro de la carcasa. Solo el título y sus
 * acciones: la navegación vive en la barra lateral, que es lo que retiró aquella
 * cabecera de botones sueltos que se partía en tres líneas con títulos largos.
 */
export function PanelHeader({
  title,
  highlight,
  kicker,
  meta,
  actions,
}: {
  title: string
  /** La parte del título que va en verde e itálica, como el `<b>` de la maqueta. */
  highlight?: string | undefined
  kicker?: string
  meta?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6.5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {kicker ? <p className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-55">{kicker}</p> : null}
        <h1 className="mt-1.5 font-display text-[30px] leading-none font-light text-ink min-[560px]:text-[38px]">
          {title}
          {highlight === undefined ? null : <b className="font-normal text-sage italic">{highlight}</b>}
        </h1>
        {meta ? <p className="mt-2 text-[13px] text-ink-soft">{meta}</p> : null}
      </div>
      {/* En el celular, las acciones en **una sola fila que se desliza**, sin estirarse ni apilarse: cuatro
          botones a lo ancho ocupaban medio teléfono antes de la lista (6 de octubre). */}
      {actions ? (
        <div className="-mx-4.5 flex w-[calc(100%+36px)] flex-nowrap items-center gap-2 overflow-x-auto px-4.5 pb-1 [scrollbar-width:none] *:shrink-0 min-[560px]:mx-0 min-[560px]:w-auto min-[560px]:flex-wrap min-[560px]:overflow-visible min-[560px]:px-0 min-[560px]:pb-0 min-[560px]:gap-2.5 [&::-webkit-scrollbar]:hidden">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
