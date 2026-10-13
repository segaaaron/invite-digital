import type { ReactNode } from 'react'
import { MenuMovil } from './MenuMovil'

/**
 * **La barra de arriba de la maqueta «Esmeralda y Latón»** (12 de octubre).
 *
 * - Tablet y escritorio: a lo ancho, con su filete abajo; a la izquierda dónde se está («Faltan 6 días para la boda»,
 *   la ruta, la fecha) y a la derecha las acciones de siempre (Ver mi invitación, la campana).
 * - Celular: la isla flotante, con el sello y el menú guiado a la izquierda y la campana a la derecha.
 *
 * Un solo montaje de la campana: una escucha en vivo.
 */
export function BarraSuperior({
  izquierda,
  arriba,
  enElCelular,
  children,
}: {
  /** Lo que dice dónde se está, en tablet y escritorio. */
  izquierda?: ReactNode
  /** Acciones que solo caben en tablet y escritorio (Ver mi invitación). */
  arriba?: ReactNode
  /** Acciones solo de la isla del celular (el ojo de «Ver mi invitación»). */
  enElCelular?: ReactNode
  /** Acciones en todos los tamaños (la campana). */
  children?: ReactNode
  /** Ya no se usan: el nombre del evento lo dicen la tarjeta de la barra lateral y el menú. */
  titulo?: string | undefined
  subtitulo?: string | undefined
}) {
  return (
    <header className="sticky top-2.5 z-30 mx-4 mt-2.5 mb-4 flex min-h-15 items-center gap-1.5 rounded-[18px] border border-line-panel bg-bg-raised/92 px-1.5 shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] backdrop-blur-md backdrop-saturate-150 min-[768px]:top-0 min-[768px]:mx-0 min-[768px]:mt-0 min-[768px]:mb-0 min-[768px]:min-h-[76px] min-[768px]:gap-3 min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:border-b min-[768px]:bg-bg/92 min-[768px]:px-6 min-[768px]:shadow-none min-[1280px]:min-h-[85px] min-[1280px]:px-12 print:hidden">
      <MenuMovil />
      <div className="hidden min-w-0 flex-1 truncate text-[14px] text-ink-mute min-[768px]:block">{izquierda}</div>
      <div className="ml-auto flex shrink-0 items-center gap-2 min-[768px]:gap-3">
        {arriba ? <div className="hidden items-center gap-3 min-[768px]:flex">{arriba}</div> : null}
        {/* La acción de la pantalla (`AccionDeLaIsla`) va aquí; si la hay, ocupa el sitio del ojo. */}
        <div className="flex items-center min-[768px]:hidden [&:has(#accion-de-la-isla:not(:empty))>.ojo-de-la-isla]:hidden">
          <div className="flex items-center" id="accion-de-la-isla" />
          {enElCelular ? <div className="ojo-de-la-isla flex items-center">{enElCelular}</div> : null}
        </div>
        {children}
      </div>
    </header>
  )
}
