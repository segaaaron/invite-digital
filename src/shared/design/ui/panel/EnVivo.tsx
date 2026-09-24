'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { RefreshIcon } from '../icons'

type Tipo = 'rsvp' | 'ingreso' | 'visita'
type Estado = 'conectando' | 'en-vivo' | 'sin-conexion'

/**
 * Los cambios del evento en vivo, sin sondeo: una conexión SSE (`EventSource`) que el servidor
 * solo usa cuando Postgres avisa de algo. Sin temporizadores: el navegador reconecta él solo si
 * se corta, y al volver solo se avisa si en el corte cambió algo (`Last-Event-ID`).
 *
 * - `auto` (la puerta): cada aviso vuelve a pintar la pantalla. Nadie tiene tiempo de pulsar.
 * - `aviso` (el panel): una franja «N novedades · Ver». No se repinta sola: movería la pantalla
 *   a quien está escribiendo o editando.
 * - `oculto`: sin nada visible (la puerta a pantalla completa tiene su propia cabecera).
 *
 * `tipos`: los avisos que le importan a esta pantalla (a Invitados, las visitas no).
 */
export function EnVivo({ url, tipos, modo, oculto = false }: { url: string; tipos: readonly Tipo[]; modo: 'auto' | 'aviso'; oculto?: boolean }) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('conectando')
  const [novedades, setNovedades] = useState(0)
  const [actualizando, empezar] = useTransition()
  const clave = tipos.join(',')

  useEffect(() => {
    const importan = new Set(clave.split(','))
    const fuente = new EventSource(url)
    fuente.onopen = () => setEstado('en-vivo')
    // CONNECTING: el navegador ya está reconectando solo. CLOSED: no hay vuelta (404, sesión caducada).
    fuente.onerror = () => setEstado(fuente.readyState === EventSource.CLOSED ? 'sin-conexion' : 'conectando')
    fuente.addEventListener('cambio', (evento) => {
      let tipo = ''
      try {
        tipo = (JSON.parse((evento as MessageEvent<string>).data) as { tipo?: string }).tipo ?? ''
      } catch {
        return
      }
      if (tipo !== 'resync' && !importan.has(tipo)) return
      if (modo === 'auto') empezar(() => router.refresh())
      else setNovedades((n) => n + 1)
    })
    return () => fuente.close()
  }, [url, clave, modo, router])

  const actualizar = () =>
    empezar(() => {
      setNovedades(0)
      router.refresh()
    })

  if (oculto) return null

  return (
    <div aria-live="polite" className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-[12px] text-ink-mute">
        <span
          aria-hidden
          className={`size-2 rounded-full ${estado === 'en-vivo' ? 'bg-sage' : estado === 'conectando' ? 'bg-gold' : 'bg-ink-mute/50'}`}
        />
        {estado === 'en-vivo' ? 'En vivo' : estado === 'conectando' ? 'Conectando…' : 'Sin actualización automática'}
      </span>
      {novedades > 0 ? (
        <button
          className="cursor-pointer rounded-full bg-ink px-4 py-1.5 text-[12.5px] text-white transition-colors hover:bg-ink/90"
          onClick={actualizar}
          type="button"
        >
          {novedades === 1 ? '1 novedad' : `${novedades} novedades`} · Ver
        </button>
      ) : (
        <button
          aria-busy={actualizando}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-panel-strong bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:border-ink disabled:opacity-60"
          disabled={actualizando}
          onClick={actualizar}
          type="button"
        >
          <RefreshIcon className={`size-3.5 ${actualizando ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          Actualizar
        </button>
      )}
    </div>
  )
}
