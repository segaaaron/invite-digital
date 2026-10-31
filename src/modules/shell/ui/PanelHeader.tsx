import type { ReactNode } from 'react'
import { HUECO_DE_LA_ISLA } from '@/shared/design/ui/panel/AccionDeLaIsla'

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
  /** Las acciones de vez en cuando (exportar, importar…), en la fila con las demás, también en el celular. */
  menu?: ReactNode
  /**
   * Si todas las acciones se esconden **en el celular** (van a la isla junto al título): ahí no se deja su fila vacía.
   *
   * El corte es 768, el mismo al que la isla deja de pintarse. Estaba en 859 y entre 768 y 859 —un iPad de pie—
   * no se veía **ninguna**: ni la fila, escondida aquí, ni la isla, escondida desde 768. En Invitados eso dejaba
   * la tableta sin «Añadir invitado» (30 oct).
   */
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
      {/* En el celular, la acción principal de la pantalla («＋ Añadir») junto al título, con su palabra (v2.1, 14 oct).
          La pone cada página con `AccionDeLaIsla`; en tablet y escritorio va en la fila de acciones. */}
      <div className="flex shrink-0 items-center self-center min-[768px]:hidden" id={HUECO_DE_LA_ISLA} />
      {/* En el celular, las acciones en **una sola fila que se desliza**, sin estirarse ni apilarse: cuatro
          botones a lo ancho ocupaban medio teléfono antes de la lista (6 de octubre). */}
      {actions || menu ? (
        <div className={`${accionesSoloEnEscritorio ? 'max-[767px]:hidden ' : ''}-mx-4 flex w-[calc(100%+32px)] flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] *:shrink-0 max-[559px]:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] min-[560px]:mx-0 min-[560px]:w-auto min-[560px]:flex-wrap min-[560px]:overflow-visible min-[560px]:px-0 min-[560px]:pb-0 min-[560px]:gap-2.5 [&::-webkit-scrollbar]:hidden`}>
          {actions}
          {/* Lo de vez en cuando (importar, exportar) también a la vista y con texto: el «⋯ Más» lo escondía (v2.1). */}
          {menu ? <div className="contents">{menu}</div> : null}
        </div>
      ) : null}
    </header>
    {pestanas}
    {bajoPestanas ? <p className="-mt-3 mb-7 max-w-[680px] text-[15px] text-ink-mute max-[859px]:mb-5">{bajoPestanas}</p> : null}
    </>
  )
}
