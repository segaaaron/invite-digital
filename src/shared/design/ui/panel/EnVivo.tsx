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
/**
 * Abre la conexión SSE y **la cierra al dejar la página** (`pagehide`). Sin eso, Chrome guarda la
 * página en su caché de ida y vuelta con la conexión viva: con HTTP/1.1 (6 por servidor) unas cuantas
 * navegaciones dejaban el panel sin conexiones y sin cargar. Si la página vuelve de esa caché
 * (`pageshow` con `persisted`), se reabre y avisa `resync`: pudo perderse algo mientras estaba guardada.
 * Devuelve cómo darse de baja.
 */
export function escucharEnVivo(
  url: string,
  al: { alAbrir: () => void; alFallar: (cerrada: boolean) => void; alCambiar: (tipo: string) => void },
): () => void {
  let fuente: EventSource | null = null
  const abrir = () => {
    const f = new EventSource(url)
    f.onopen = al.alAbrir
    // CONNECTING: el navegador ya está reconectando solo. CLOSED: no hay vuelta (404, sesión caducada).
    f.onerror = () => al.alFallar(f.readyState === EventSource.CLOSED)
    f.addEventListener('cambio', (evento) => {
      try {
        al.alCambiar((JSON.parse((evento as MessageEvent<string>).data) as { tipo?: string }).tipo ?? '')
      } catch {
        // Un aviso que no se entiende no cambia nada.
      }
    })
    fuente = f
  }
  const cerrar = () => {
    fuente?.close()
    fuente = null
  }
  const alOcultar = () => cerrar()
  const alMostrar = (e: PageTransitionEvent) => {
    if (!e.persisted || fuente !== null) return
    abrir()
    al.alCambiar('resync')
  }
  abrir()
  window.addEventListener('pagehide', alOcultar)
  window.addEventListener('pageshow', alMostrar)
  return () => {
    window.removeEventListener('pagehide', alOcultar)
    window.removeEventListener('pageshow', alMostrar)
    cerrar()
  }
}

export function EnVivo({ url, tipos, modo, oculto = false }: { url: string; tipos: readonly Tipo[]; modo: 'auto' | 'aviso'; oculto?: boolean }) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('conectando')
  const [novedades, setNovedades] = useState(0)
  const [actualizando, empezar] = useTransition()
  const clave = tipos.join(',')

  useEffect(() => {
    const importan = new Set(clave.split(','))
    return escucharEnVivo(url, {
      alAbrir: () => setEstado('en-vivo'),
      alFallar: (cerrada) => setEstado(cerrada ? 'sin-conexion' : 'conectando'),
      alCambiar: (tipo) => {
        if (tipo !== 'resync' && !importan.has(tipo)) return
        if (modo === 'auto') empezar(() => router.refresh())
        else setNovedades((n) => n + 1)
      },
    })
  }, [url, clave, modo, router])

  const actualizar = () =>
    empezar(() => {
      setNovedades(0)
      router.refresh()
    })

  if (oculto) return null

  // Una píldora pequeña a la derecha, no una fila entera: estaba en cada pantalla y empujaba el contenido.
  // **En el celular solo aparece cuando hay algo que decir** (novedades o sin conexión) y flota sobre la
  // barra de abajo: en reposo era una fila entera entre la cabecera y lo que se vino a ver (7 de octubre).
  const enReposo = novedades === 0 && estado !== 'sin-conexion'
  return (
    <div
      aria-live="polite"
      className={`-mt-2 mb-3 flex justify-end ${enReposo ? 'max-[859px]:hidden' : 'max-[859px]:fixed max-[859px]:inset-x-0 max-[767px]:bottom-[calc(96px+env(safe-area-inset-bottom))] min-[768px]:max-[859px]:bottom-6 min-[768px]:max-[859px]:left-[76px] max-[859px]:z-30 max-[859px]:m-0 max-[859px]:justify-center'}`}
    >
      <div className="inline-flex items-center gap-1 rounded-full border border-line-panel bg-white/70 py-0.5 pr-0.5 pl-3 text-[12px] text-ink-mute shadow-card backdrop-blur-sm">
        <span className="flex items-center gap-1.5 pr-1.5">
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${estado === 'en-vivo' ? 'bg-sage' : estado === 'conectando' ? 'bg-gold' : 'bg-ink-mute/50'}`}
          />
          {estado === 'en-vivo' ? 'En vivo' : estado === 'conectando' ? 'Conectando…' : 'Sin actualización automática'}
        </span>
        {novedades > 0 ? (
          <button className="cursor-pointer rounded-full bg-ink px-3 py-1 text-[12px] text-white transition-colors hover:bg-ink/90" onClick={actualizar} type="button">
            {novedades === 1 ? '1 novedad' : `${novedades} novedades`} · Ver
          </button>
        ) : (
          <button
            aria-busy={actualizando}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-soft max-[859px]:min-h-10 max-[859px]:px-3.5 max-[859px]:text-[13px] transition-colors hover:bg-bg-sunken hover:text-ink disabled:opacity-60"
            disabled={actualizando}
            onClick={actualizar}
            type="button"
          >
            <RefreshIcon className={`size-3.5 ${actualizando ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            Actualizar
          </button>
        )}
      </div>
    </div>
  )
}
