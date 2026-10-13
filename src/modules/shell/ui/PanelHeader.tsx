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
  pestanas,
  bajoPestanas,
  tituloEnCelular,
}: {
  title: string
  /** La parte del título que va en verde e itálica, como el `<b>` de la maqueta. */
  highlight?: string | undefined
  kicker?: string
  meta?: string | undefined
  actions?: ReactNode
  /**
   * Las acciones de vez en cuando (exportar, importar…). En escritorio van en la fila con las demás; **en
   * el celular, en el «⋯» junto al título** (maqueta 2 del panel móvil, 7 de octubre).
   */
  menu?: ReactNode
  /** Si todas las acciones se esconden en el celular (van a la barra de abajo o flotan): ahí no se deja su fila vacía. */
  accionesSoloEnEscritorio?: boolean
  /** Las pestañas de la sección (maqueta: bajo el título, subrayadas). */
  pestanas?: ReactNode
  /** La línea que dice qué es esta pestaña, debajo de las pestañas (maqueta: Ajustes › Registro de fallos). */
  bajoPestanas?: string
  /** En el celular, otro título: dentro de Ajustes cada pantalla se llama por lo suyo («Equipo», M69). */
  tituloEnCelular?: string
}) {
  return (
    <>
    {/* Maqueta «Esmeralda y Latón»: el título en Bodoni a 40 px, su línea debajo y las acciones abajo a la derecha. El
        `kicker` ya no se pinta: la ruta va en la barra de arriba. */}
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${pestanas ? 'mb-6' : 'mb-8'} max-[859px]:mb-4`} data-kicker={kicker}>
      <div className="min-w-0 flex-[1_1_420px] max-[859px]:flex-1">
        <h1 className="font-display text-[30px] leading-[1.08] font-medium text-ink min-[560px]:text-[40px]">
          {tituloEnCelular === undefined ? (
            title
          ) : (
            <>
              <span className="max-[767px]:hidden">{title}</span>
              <span className="min-[768px]:hidden">{tituloEnCelular}</span>
            </>
          )}
          {highlight === undefined ? null : <b className="font-medium">{highlight}</b>}
        </h1>
        {/* En el celular las maquetas van sin la línea de ayuda: el título y lo que se hace. */}
        {meta ? <p className="mt-2 max-w-[640px] text-[16px] text-ink-mute max-[767px]:hidden">{meta}</p> : null}
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
        <div className={`${accionesSoloEnEscritorio ? 'max-[859px]:hidden ' : ''}-mx-4 flex w-[calc(100%+32px)] flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] *:shrink-0 min-[560px]:mx-0 min-[560px]:w-auto min-[560px]:flex-wrap min-[560px]:overflow-visible min-[560px]:px-0 min-[560px]:pb-0 min-[560px]:gap-2.5 [&::-webkit-scrollbar]:hidden`}>
          {actions}
          {menu ? <div className="contents max-[859px]:hidden">{menu}</div> : null}
        </div>
      ) : null}
    </header>
    {pestanas}
    {bajoPestanas ? <p className="-mt-3 mb-7 max-w-[680px] text-[15px] text-ink-mute max-[859px]:mb-5">{bajoPestanas}</p> : null}
    </>
  )
}
