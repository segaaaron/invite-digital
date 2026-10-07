import type { ReactNode } from 'react'

/**
 * La barra superior del panel para quien no es admin (anfitrión, planner, atelier): a la derecha la
 * campana de avisos —y lo que venga, como el asistente—. **La misma piel que la del admin**
 * (`BarraDelAdmin`): pegajosa, con vidrio marfil.
 *
 * **Con `titulo` (el panel de un evento, que en el celular navega con la barra inferior)** es también la
 * cabecera del celular: el nombre del evento a la izquierda y la campana a la derecha, una sola barra
 * clara (6 de octubre). Antes ahí iba la barra oscura con «Menú».
 *
 * **Sin `titulo` no es una barra en el celular**: la campana flota dentro de la barra oscura, a la derecha
 * de «Menú» (que le deja el sitio: `PanelFrame conAcciones`). Un solo montaje: una escucha en vivo.
 */
export function BarraSuperior({ children, titulo, subtitulo }: { children?: ReactNode; titulo?: string | undefined; subtitulo?: string | undefined }) {
  if (titulo !== undefined) {
    return (
      // Sin nada a la derecha (en modo soporte no hay campana), en escritorio no se pinta: sería una franja vacía.
      <div
        className={`sticky top-0 z-30 -mx-4.5 -mt-4.5 mb-4 flex items-center gap-3 border-b border-line-panel bg-bg/85 px-4.5 pt-[max(env(safe-area-inset-top),10px)] pb-2.5 backdrop-blur-md backdrop-saturate-150 min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:mb-6 min-[860px]:px-8 min-[860px]:py-3 ${children == null ? 'min-[860px]:hidden' : ''}`}
      >
        <div className="min-w-0 flex-1 min-[860px]:hidden">
          {subtitulo === undefined ? null : <p className="truncate font-mono text-[10.5px] tracking-[0.16em] text-gold-deep uppercase">{subtitulo}</p>}
          <p className="truncate font-display text-[20px] leading-tight text-ink">{titulo}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
      </div>
    )
  }
  return (
    <div className="fixed top-1.5 right-3 z-60 flex items-center gap-2 min-[860px]:sticky min-[860px]:top-0 min-[860px]:right-auto min-[860px]:z-30 min-[860px]:-mx-8 min-[860px]:-mt-7 min-[860px]:mb-6 min-[860px]:border-b min-[860px]:border-line-panel min-[860px]:bg-bg/80 min-[860px]:px-8 min-[860px]:py-3 min-[860px]:backdrop-blur-md min-[860px]:backdrop-saturate-150">
      <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
