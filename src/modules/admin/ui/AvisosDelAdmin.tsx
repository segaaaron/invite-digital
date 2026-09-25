'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { BellIcon } from '@/shared/design/ui/icons'

/**
 * La campana del admin: consultas y pedidos que llegan **mientras** mira el panel. Una conexión
 * SSE que el servidor solo usa cuando Postgres avisa (`0071`): sin sondeo ni temporizadores, y
 * el navegador reconecta solo. No repinta la pantalla —podría estar escribiendo—: cuenta y,
 * al pulsar, la vuelve a pintar con las insignias y el tablero al día.
 */
export function AvisosDelAdmin() {
  const router = useRouter()
  const [novedades, setNovedades] = useState(0)
  const [conectado, setConectado] = useState(false)
  const [, empezar] = useTransition()

  useEffect(() => {
    const fuente = new EventSource('/panel/admin/en-vivo')
    fuente.onopen = () => setConectado(true)
    fuente.onerror = () => setConectado(false)
    fuente.addEventListener('cambio', () => setNovedades((n) => n + 1))
    return () => fuente.close()
  }, [])

  const ver = () =>
    empezar(() => {
      setNovedades(0)
      router.refresh()
    })

  const rotulo = novedades === 0 ? (conectado ? 'Sin novedades: en vivo' : 'Avisos sin conexión') : `${novedades === 1 ? '1 novedad' : `${novedades} novedades`} en ventas · Actualizar`

  return (
    <button
      aria-label={rotulo}
      className={`relative inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] transition-colors ${
        novedades > 0 ? 'border-ink bg-ink text-white hover:bg-ink/90' : 'border-line-panel-strong bg-white/80 text-ink-soft hover:border-ink hover:text-ink'
      }`}
      onClick={ver}
      title={rotulo}
      type="button"
    >
      <BellIcon className="size-4" />
      {novedades > 0 ? (
        <span aria-hidden className="font-display text-[15px] [font-variant-numeric:lining-nums]">
          {novedades}
        </span>
      ) : (
        <span aria-hidden className={`absolute top-2 right-2.5 size-1.5 rounded-full ${conectado ? 'bg-sage' : 'bg-ink-mute/50'}`} />
      )}
      <span aria-live="polite" className="sr-only">
        {novedades > 0 ? rotulo : ''}
      </span>
    </button>
  )
}
