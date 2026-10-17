'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeftIcon } from '@/shared/design/ui/icons'
import { BuscadorRapido } from './BuscadorRapido'
import { MenuCrear, MenuCrearMovil } from './MenuCrear'
import { IslaDelAdmin, RutaDelAdmin } from './PestanasDeAdmin'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  const t = useT()
  return (
    <header className="sticky top-0 z-30 max-[767px]:[body:has([data-sin-isla])_&]:hidden mb-4 flex min-h-14 items-center gap-2 border-b border-line-panel bg-bg-raised/95 px-3 backdrop-blur-md backdrop-saturate-150 min-[768px]:mb-0 min-[768px]:min-h-[76px] min-[768px]:gap-3 min-[768px]:bg-bg/92 min-[768px]:px-6 min-[1280px]:min-h-[85px] min-[1280px]:px-12 print:hidden">
      {/* Dentro de un evento la barra vuelve a la cartera y, antes, siempre en el mismo sitio, «Menú» lleva a Invitados, Mesas… (sin repetir
          el nombre del evento, que ya dice la flecha). */}
      {evento === undefined ? null : <span className="contents [&_[data-contexto]]:hidden">{menu}</span>}
      {evento === undefined ? (
        <IslaDelAdmin menu={menu} />
      ) : (
        <Link className="flex min-w-0 flex-1 items-center gap-2 text-ink no-underline min-[768px]:hidden" href="/panel/admin/eventos">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] text-ink-mute">{t('Eventos', 'Events')}</span>
            <span className="truncate text-[16px] font-medium">{evento}</span>
          </span>
          <span className="sr-only">{t(': volver a todos los eventos', ': back to all events')}</span>
        </Link>
      )}
      <div className="hidden min-w-0 flex-1 truncate text-[14px] text-ink-mute min-[768px]:block">
        {evento === undefined ? (
          <RutaDelAdmin hoy={hoy} />
        ) : (
          <nav aria-label={t('Ruta', 'Path')} className="flex items-center gap-2 text-[14px]">
            <Link className="inline-flex min-h-11 items-center text-ink-mute no-underline hover:text-ink" href="/panel/admin/eventos">
              {t('Eventos', 'Events')}
            </Link>
            <span aria-hidden>/</span>
            <span className="font-medium text-ink">{evento}</span>
          </nav>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 min-[768px]:gap-3">
        <BuscadorRapido />
        {campana}
        <div className="hidden min-[768px]:block">
          <MenuCrear />
        </div>
        <div className="min-[768px]:hidden">
          <MenuCrearMovil compacto />
        </div>
      </div>
    </header>
  )
}
