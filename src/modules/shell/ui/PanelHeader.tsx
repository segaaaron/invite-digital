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
  menu,
  accionesSoloEnEscritorio = false,
}: {
  title: string
  /** La parte del título que va en verde e itálica, como el `<b>` de la maqueta. */
  highlight?: string | undefined
  kicker?: string
  meta?: string
  actions?: ReactNode
  /**
   * Las acciones de vez en cuando (exportar, importar…). En escritorio van en la fila con las demás; **en
   * el celular, en el «⋯» junto al título** (maqueta 2 del panel móvil, 7 de octubre).
   */
  menu?: ReactNode
  /** Si todas las acciones se esconden en el celular (van a la barra de abajo o flotan): ahí no se deja su fila vacía. */
  accionesSoloEnEscritorio?: boolean
}) {
  return (
    <header className="mb-6.5 flex flex-wrap items-start justify-between gap-4 max-[859px]:mb-4">
      <div className="min-w-0 max-[859px]:flex-1">
        {kicker ? <p className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-55">{kicker}</p> : null}
        <h1 className="mt-1.5 font-display text-[30px] leading-none font-light text-ink min-[560px]:text-[38px]">
          {title}
          {highlight === undefined ? null : <b className="font-normal text-sage italic">{highlight}</b>}
        </h1>
        {meta ? <p className="mt-2 text-[13px] text-ink-soft">{meta}</p> : null}
      </div>
      {menu ? (
        <details className="group/menu relative shrink-0 min-[860px]:hidden">
          <summary
            aria-label="Más acciones"
            className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-line-panel bg-white/80 text-ink-soft [&::-webkit-details-marker]:hidden"
          >
            <svg aria-hidden className="size-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </summary>
          <div className="absolute top-full right-0 z-30 mt-2 flex w-60 flex-col items-stretch gap-2 rounded-[18px] border border-line-panel bg-bg-raised p-2.5 shadow-float *:w-full *:justify-start">
            {menu}
          </div>
        </details>
      ) : null}
      {/* En el celular, las acciones en **una sola fila que se desliza**, sin estirarse ni apilarse: cuatro
          botones a lo ancho ocupaban medio teléfono antes de la lista (6 de octubre). */}
      {actions || menu ? (
        <div className={`${accionesSoloEnEscritorio ? 'max-[859px]:hidden ' : ''}-mx-4.5 flex w-[calc(100%+36px)] flex-nowrap items-center gap-2 overflow-x-auto px-4.5 pb-1 [scrollbar-width:none] *:shrink-0 min-[560px]:mx-0 min-[560px]:w-auto min-[560px]:flex-wrap min-[560px]:overflow-visible min-[560px]:px-0 min-[560px]:pb-0 min-[560px]:gap-2.5 [&::-webkit-scrollbar]:hidden`}>
          {actions}
          {menu ? <div className="contents max-[859px]:hidden">{menu}</div> : null}
        </div>
      ) : null}
    </header>
  )
}
