'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { moveElementsAction } from '../actions'
import type { SeatedTable } from '../application/list-seating'
import type { ElementMove } from '../application/move-element'
import { seatRing } from '../domain/seat-ring'
import { clampToPlan } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'

type Exit = { href: string; label: string }

type Props = {
  eventId: string
  eventSlug: string
  tables: readonly SeatedTable[]
  zones: readonly VenueZone[]
  /** Salidas dentro de la aplicación. El plano las intercepta si hay cambios sin guardar. */
  exits: readonly Exit[]
}

type Punto = { x: number; y: number }
type Mapa = Record<string, Punto>

const clave = (kind: 'table' | 'zone', id: string) => `${kind}:${id}`

const posicionesDe = (tables: readonly SeatedTable[], zones: readonly VenueZone[]): Mapa => {
  const mapa: Mapa = {}
  for (const t of tables) mapa[clave('table', t.id)] = { x: t.x, y: t.y }
  for (const z of zones) mapa[clave('zone', z.id)] = { x: z.x, y: z.y }
  return mapa
}

const firma = (mapa: Mapa): string =>
  Object.keys(mapa)
    .sort()
    .map((k) => `${k}:${mapa[k]?.x},${mapa[k]?.y}`)
    .join('|')

const ZONA_TEXTO: Record<VenueZone['kind'], string> = {
  dance: 'Pista',
  bar: 'Barra',
  stage: 'Tarima',
  music: 'Música',
  entrance: 'Entrada',
}

const bordeDeMesa = (table: SeatedTable): string => {
  if (table.free === 0) return 'border-danger'
  if (table.taken === 0) return 'border-line'
  return 'border-warn'
}

const PASO_TECLADO = 1

/**
 * Se lee `matchMedia` directamente y no el hook de framer-motion: aquel resuelve la
 * preferencia una sola vez por proceso y la cachea, de modo que el valor acaba
 * dependiendo de qué componente montó primero.
 *
 * Un entorno sin `matchMedia` no puede expresar la preferencia: se asume que no la hay
 * en vez de reventar el plano.
 */
const CONSULTA = '(prefers-reduced-motion: reduce)'

const suscribirseAlMovimiento = (alCambiar: () => void): (() => void) => {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', alCambiar)
  return () => mq.removeEventListener('change', alCambiar)
}

const leerMovimiento = (): boolean =>
  typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA).matches : false

const enElServidor = (): boolean => false

const usePrefiereMenosMovimiento = (): boolean =>
  useSyncExternalStore(suscribirseAlMovimiento, leerMovimiento, enElServidor)

/**
 * El plano no guarda al arrastrar ni al soltar: acumula los movimientos en local y los
 * manda en un solo lote cuando el atelier pulsa «Guardar». Guardar por fotograma serían
 * miles de escrituras por cada mesa que alguien mueve, y guardar al soltar deja al
 * atelier sin forma de deshacer una recolocación entera.
 *
 * Se mueve con el ratón y con las flechas del teclado. Un plano solo arrastrable deja
 * fuera a quien no usa ratón.
 */
export function FloorPlan({ eventId, eventSlug, tables, zones, exits }: Props) {
  const router = useRouter()
  const reduceMotion = usePrefiereMenosMovimiento()
  const plano = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ key: string; desdeX: number; desdeY: number; origen: Punto } | null>(null)

  const inicial = posicionesDe(tables, zones)
  const [guardadas, setGuardadas] = useState<Mapa>(inicial)
  const [actuales, setActuales] = useState<Mapa>(inicial)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [salida, setSalida] = useState<Exit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Si el servidor devuelve otras posiciones —otra pestaña, un revalidate— se adoptan,
  // pero solo cuando no hay trabajo local sin guardar: pisarlo sería perder el gesto.
  // Ajuste durante el render, no en un efecto: así no hay un fotograma con las
  // posiciones viejas ya pintadas.
  const firmaEntrante = firma(inicial)
  const [firmaBase, setFirmaBase] = useState(firmaEntrante)
  const sinCambios = firma(actuales) === firma(guardadas)
  if (firmaEntrante !== firmaBase && sinCambios) {
    setFirmaBase(firmaEntrante)
    setGuardadas(inicial)
    setActuales(inicial)
  }

  const pendientes = Object.keys(actuales).filter(
    (k) => actuales[k]?.x !== guardadas[k]?.x || actuales[k]?.y !== guardadas[k]?.y,
  )
  const hayPendientes = pendientes.length > 0

  // El aviso del navegador al cerrar la pestaña es lo único que se puede hacer ahí; el
  // texto lo pone él. Se registra solo mientras hay algo que perder: dejarlo puesto
  // haría que el atelier se comiera el aviso en cada recarga aunque no deba nada.
  useEffect(() => {
    if (!hayPendientes) return
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayPendientes])

  const mover = (key: string, punto: Punto) => {
    setActuales((prev) => ({ ...prev, [key]: { x: clampToPlan(punto.x), y: clampToPlan(punto.y) } }))
  }

  const alPulsar = (key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const origen = actuales[key]
    if (!origen) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    arrastre.current = { key, desdeX: e.clientX, desdeY: e.clientY, origen }
    setArrastrando(key)
  }

  const alArrastrar = (e: React.PointerEvent<HTMLButtonElement>) => {
    const activo = arrastre.current
    const caja = plano.current?.getBoundingClientRect()
    if (!activo || !caja || caja.width === 0 || caja.height === 0) return
    mover(activo.key, {
      x: activo.origen.x + ((e.clientX - activo.desdeX) / caja.width) * 100,
      y: activo.origen.y + ((e.clientY - activo.desdeY) / caja.height) * 100,
    })
  }

  const alSoltar = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    // Aquí no se guarda nada a propósito: el lote viaja al pulsar «Guardar».
    arrastre.current = null
    setArrastrando(null)
  }

  const alTeclear = (key: string) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const paso: Record<string, Punto> = {
      ArrowLeft: { x: -PASO_TECLADO, y: 0 },
      ArrowRight: { x: PASO_TECLADO, y: 0 },
      ArrowUp: { x: 0, y: -PASO_TECLADO },
      ArrowDown: { x: 0, y: PASO_TECLADO },
    }
    const delta = paso[e.key]
    const origen = actuales[key]
    if (!delta || !origen) return
    e.preventDefault()
    mover(key, { x: origen.x + delta.x, y: origen.y + delta.y })
  }

  const loteDeCambios = (): ElementMove[] => {
    const moves: ElementMove[] = []
    for (const t of tables) {
      const k = clave('table', t.id)
      if (pendientes.includes(k)) moves.push({ kind: 'table', id: t.id, x: actuales[k]!.x, y: actuales[k]!.y })
    }
    for (const z of zones) {
      const k = clave('zone', z.id)
      if (pendientes.includes(k)) moves.push({ kind: 'zone', id: z.id, x: actuales[k]!.x, y: actuales[k]!.y })
    }
    return moves
  }

  const guardar = async (): Promise<boolean> => {
    setError(null)
    setGuardando(true)
    try {
      const r = await moveElementsAction({ eventId, eventSlug, moves: loteDeCambios() })
      if (!r.ok) {
        // Los cambios locales se quedan: perder la colocación por un fallo del servidor
        // obligaría a rehacer el salón entero.
        setError(r.message ?? 'No se pudo guardar el plano.')
        return false
      }
      setGuardadas(actuales)
      return true
    } finally {
      setGuardando(false)
    }
  }

  const descartar = () => {
    setError(null)
    setActuales(guardadas)
  }

  const intentarSalir = (exit: Exit) => {
    if (!hayPendientes) {
      router.push(exit.href)
      return
    }
    setSalida(exit)
  }

  const estiloDe = (key: string, arrastrando: boolean): React.CSSProperties => ({
    left: `${actuales[key]?.x ?? 0}%`,
    top: `${actuales[key]?.y ?? 0}%`,
    // Sin transición mientras se arrastra: la marca tiene que ir pegada al dedo.
    transition: reduceMotion || arrastrando ? 'none' : 'left 140ms ease-out, top 140ms ease-out',
  })

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p aria-label="Estado del plano" role="status" className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-warn">
          {hayPendientes
            ? `${pendientes.length} cambio${pendientes.length === 1 ? '' : 's'} sin guardar`
            : 'Plano guardado'}
        </p>
        <button
          type="button"
          disabled={!hayPendientes || guardando}
          onClick={() => void guardar()}
          className="ml-auto rounded-pill border border-ok px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ok disabled:opacity-40"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          disabled={!hayPendientes || guardando}
          onClick={descartar}
          className="rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
        >
          Descartar
        </button>
        {exits.map((exit) => (
          <a
            key={exit.href}
            href={exit.href}
            onClick={(e) => {
              e.preventDefault()
              intentarSalir(exit)
            }}
            className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
          >
            {exit.label}
          </a>
        ))}
      </div>

      {error === null ? null : (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}

      <div
        ref={plano}
        aria-label="Plano del salón"
        className="relative aspect-[4/3] w-full rounded-card border border-line bg-bg-sunken"
      >
        {zones.map((zone) => {
          const key = clave('zone', zone.id)
          return (
            <button
              key={key}
              type="button"
              aria-label={`${ZONA_TEXTO[zone.kind]}: ${zone.label}. Muévela con las flechas.`}
              onPointerDown={alPulsar(key)}
              onPointerMove={alArrastrar}
              onPointerUp={alSoltar}
              onKeyDown={alTeclear(key)}
              style={{ ...estiloDe(key, arrastrando === key), width: `${zone.w}%`, height: `${zone.h}%` }}
              className="absolute touch-none rounded-card border border-dashed border-line bg-bg-top/60 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
            >
              {zone.label}
            </button>
          )
        })}

        {tables.map((table) => {
          const key = clave('table', table.id)
          const sillas = seatRing(table.capacity, table.groups)
          return (
            <button
              key={key}
              type="button"
              aria-label={`${table.label}: ${table.taken} de ${table.capacity} sitios${
                table.groups.length === 0 ? ' y nadie sentado' : `. Se sientan ${table.groups.map((g) => g.label).join(', ')}`
              }. Muévela con las flechas.`}
              onPointerDown={alPulsar(key)}
              onPointerMove={alArrastrar}
              onPointerUp={alSoltar}
              onKeyDown={alTeclear(key)}
              style={estiloDe(key, arrastrando === key)}
              className="absolute size-[112px] -translate-x-1/2 -translate-y-1/2 touch-none text-ink"
            >
              {/* Las sillas alrededor, como en la maqueta: la ocupada lleva la inicial de
                  su grupo. Son decorativas para el lector de pantalla —los nombres ya van
                  en la etiqueta del botón—; repetir ocho iniciales sueltas sería ruido. */}
              <span aria-hidden className="absolute inset-0">
                {sillas.map((silla, indice) => (
                  <span
                    key={indice}
                    className={`absolute top-1/2 left-1/2 flex size-4.5 items-center justify-center rounded-full font-mono text-[8px] ${
                      silla.occupant === null ? 'bg-bg-top text-ink-mute' : 'bg-sage text-white'
                    }`}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${silla.angle}deg) translateY(-42px) rotate(${-silla.angle}deg)`,
                    }}
                  >
                    {silla.initial ?? indice + 1}
                  </span>
                ))}
              </span>

              {/* Dentro va el número, como en la maqueta; el nombre entero y la
                  ocupación van debajo, donde caben sin apretarse. */}
              <span
                aria-hidden
                className={`absolute top-1/2 left-1/2 flex size-[58px] -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 bg-bg-raised font-mono text-[13px] ${bordeDeMesa(table)} ${
                  table.shape === 'round' ? 'rounded-full' : 'rounded-card'
                }`}
              >
                {table.label.replace(/^mesa\s*/i, '') || table.label}
              </span>

              <span aria-hidden className="absolute top-full left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                <span className="block font-mono text-[9px] tracking-[var(--tracking-luxe)] uppercase">{table.label}</span>
                <span className="block font-mono text-[10px] text-ink-mute">
                  {table.taken}/{table.capacity}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {salida === null ? null : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cambios sin guardar"
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6"
        >
          {/* Modal propio, no `window.confirm`: el diálogo nativo no se puede estilar,
              bloquea el hilo y queda fuera del idioma visual del panel. */}
          <div className="flex w-[min(420px,92vw)] flex-col gap-4 rounded-card bg-bg-raised p-6 shadow-float">
            <h2 className="font-display text-[22px] font-light text-ink">Tienes el plano a medias</h2>
            <p className="text-[13px] text-ink-soft">
              {pendientes.length} cambio{pendientes.length === 1 ? '' : 's'} sin guardar. Si sales ahora, se
              {pendientes.length === 1 ? ' pierde' : ' pierden'}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={guardando}
                onClick={() => {
                  const destino = salida.href
                  void guardar().then((ok) => {
                    if (!ok) return
                    setSalida(null)
                    router.push(destino)
                  })
                }}
                className="rounded-pill border border-ok px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ok disabled:opacity-40"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  const destino = salida.href
                  descartar()
                  setSalida(null)
                  router.push(destino)
                }}
                className="rounded-pill border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
              >
                Descartar y salir
              </button>
              <button
                type="button"
                onClick={() => setSalida(null)}
                className="ml-auto rounded-pill bg-ink px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-bg-top"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
