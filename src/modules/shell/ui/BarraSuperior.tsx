import type { ReactNode } from 'react'
import { MenuMovil } from './MenuMovil'

/**
 * **La barra de arriba de la maqueta «Esmeralda y Latón»** (12 de octubre).
 *
 * - Tablet y escritorio: a lo ancho, con su filete abajo; a la izquierda dónde se está («Faltan 6 días para la boda»,
 *   la ruta, la fecha) y a la derecha las acciones de siempre (Ver mi invitación, la campana).
 * - Celular (v2.1, 14 oct): una barra de 56 px pegada arriba, a lo ancho: «Menú» con su palabra, el evento y la campana.
 *   La acción de cada pantalla va junto a su título (`AccionDeLaIsla`), no aquí.
 *
 * Un solo montaje de la campana: una escucha en vivo.
 */
export function BarraSuperior({
  izquierda,
  arriba,
  children,
}: {
  /** Lo que dice dónde se está, en tablet y escritorio. */
  izquierda?: ReactNode
  /** Acciones que solo caben en tablet y escritorio (Ver mi invitación). */
  arriba?: ReactNode
  /** Ya no se usa: en el celular «Ver mi invitación» está en el menú (v2.1). */
  enElCelular?: ReactNode
  /** Acciones en todos los tamaños (la campana). */
  children?: ReactNode
  /** Ya no se usan: el nombre del evento lo dicen la tarjeta de la barra lateral y el menú. */
  titulo?: string | undefined
  subtitulo?: string | undefined
}) {
  return (
    <header className="sticky top-0 z-30 mb-4 flex min-h-14 items-center gap-2.5 border-b border-line-panel bg-bg-raised/95 px-3 backdrop-blur-md backdrop-saturate-150 min-[768px]:mb-0 min-[768px]:min-h-[76px] min-[768px]:gap-3 min-[768px]:bg-bg/92 min-[768px]:px-6 min-[1280px]:min-h-[85px] min-[1280px]:px-12 print:hidden">
      <MenuMovil />
      <div className="hidden min-w-0 flex-1 truncate text-[14px] text-ink-mute min-[768px]:block">{izquierda}</div>
      <div className="ml-auto flex shrink-0 items-center gap-2 min-[768px]:gap-3">
        {arriba ? <div className="hidden items-center gap-3 min-[768px]:flex">{arriba}</div> : null}
        {children}
      </div>
    </header>
  )
}
