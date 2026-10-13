import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeftIcon } from '@/shared/design/ui/icons'
import { BuscadorRapido } from './BuscadorRapido'
import { MenuCrear } from './MenuCrear'
import { IslaDelAdmin, RutaDelAdmin } from './PestanasDeAdmin'

/**
 * **La barra de arriba del admin** (maqueta «Esmeralda y Latón», Main · E05 · T14 · M01): en tablet y escritorio, a lo
 * ancho con su filete, la fecha o la ruta a la izquierda y la campana y «Crear» en latón a la derecha. En el celular
 * es la isla: el sello y el menú guiado (`menu`, lo pone el layout: un módulo no entra por dentro en otro), y a la
 * derecha buscar y la campana; crear se hace desde el buscador, que trae las acciones.
 */
export function BarraDelAdmin({
  campana,
  menu,
  hoy,
  evento,
}: {
  campana?: ReactNode
  /** El menú del celular (`MenuMovil` de `shell`). */
  menu: ReactNode
  /** «Lunes 12 de octubre», lo que dice la barra en Hoy. */
  hoy: string
  /** Dentro de un evento (E35, M24): la ruta dice «Eventos / su nombre» y en el celular la isla vuelve a la cartera. */
  evento?: string
}) {
  return (
    <header className="sticky top-2.5 z-30 max-[767px]:[body:has([data-sin-isla])_&]:hidden mx-4 mt-2.5 mb-4 flex min-h-15 items-center gap-1.5 rounded-[18px] border border-line-panel bg-bg-raised/92 px-1.5 shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] backdrop-blur-md backdrop-saturate-150 min-[768px]:top-0 min-[768px]:mx-0 min-[768px]:mt-0 min-[768px]:mb-0 min-[768px]:min-h-[76px] min-[768px]:gap-3 min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:border-b min-[768px]:bg-bg/92 min-[768px]:px-6 min-[768px]:shadow-none min-[1280px]:min-h-[85px] min-[1280px]:px-12 print:hidden">
      {evento === undefined ? (
        <IslaDelAdmin menu={menu} />
      ) : (
        <Link className="flex min-w-0 flex-1 items-center gap-2 text-ink no-underline min-[768px]:hidden" href="/panel/admin/eventos">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] text-ink-mute">Eventos</span>
            <span className="truncate text-[16px] font-medium">{evento}</span>
          </span>
          <span className="sr-only">: volver a todos los eventos</span>
        </Link>
      )}
      <div className="hidden min-w-0 flex-1 truncate text-[14px] text-ink-mute min-[768px]:block">
        {evento === undefined ? (
          <RutaDelAdmin hoy={hoy} />
        ) : (
          <nav aria-label="Ruta" className="flex items-center gap-2 text-[14px]">
            <Link className="text-ink-mute no-underline hover:text-ink" href="/panel/admin/eventos">
              Eventos
            </Link>
            <span aria-hidden>/</span>
            <span className="font-medium text-ink">{evento}</span>
          </nav>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 min-[768px]:gap-3">
        {/* La acción de la pantalla en el celular (`AccionDeLaIsla`: el «+» de Ventas). */}
        <div className="flex items-center min-[768px]:hidden" id="accion-de-la-isla" />
        <BuscadorRapido />
        {campana}
        <div className="hidden min-[768px]:block">
          <MenuCrear />
        </div>
      </div>
    </header>
  )
}
