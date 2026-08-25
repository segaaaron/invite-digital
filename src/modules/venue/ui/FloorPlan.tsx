'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { moveElementsAction, removeZoneAction } from '../actions'
import type { SeatedTable } from '../application/list-seating'
import type { ElementMove } from '../application/move-element'
import { seatRing } from '../domain/seat-ring'
import { matchesSearch, useSeatingSearch } from './SeatingSearchContext'
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
  /**
   * Prefijo del enlace de edición de una zona; se le pega el id.
   *
   * Es una **cadena**, no una función que la construya: un componente cliente no puede
   * recibir funciones desde el servidor, y hacerlo revienta la página entera en tiempo de
   * ejecución sin que el typecheck diga una palabra. Ya pasó en la página del plan.
   */
  zoneEditHrefPrefix?: string
}

type Punto = { x: number; y: number }
type Mapa = Record<string, Punto>
/** Ancho y alto de una zona, en porcentaje del plano. Las mesas no se redimensionan. */
type Tamano = { w: number; h: number }
type Tamanos = Record<string, Tamano>

/** Una zona más pequeña que esto no se puede ni agarrar para volver a estirarla. */
const MINIMO = 6

const clave = (kind: 'table' | 'zone', id: string) => `${kind}:${id}`

const posicionesDe = (tables: readonly SeatedTable[], zones: readonly VenueZone[]): Mapa => {
  const mapa: Mapa = {}
  for (const t of tables) mapa[clave('table', t.id)] = { x: t.x, y: t.y }
  for (const z of zones) mapa[clave('zone', z.id)] = { x: z.x, y: z.y }
  return mapa
}

const tamanosDe = (zones: readonly VenueZone[]): Tamanos => {
  const mapa: Tamanos = {}
  for (const z of zones) mapa[clave('zone', z.id)] = { w: z.w, h: z.h }
  return mapa
}

const firmaTamanos = (mapa: Tamanos): string =>
  Object.keys(mapa)
    .sort()
    .map((k) => `${k}:${mapa[k]?.w}x${mapa[k]?.h}`)
    .join('|')

const firma = (mapa: Mapa): string =>
  Object.keys(mapa)
    .sort()
    .map((k) => `${k}:${mapa[k]?.x},${mapa[k]?.y}`)
    .join('|')

const ZONA_TEXTO: Record<VenueZone['kind'], string> = {
  dance: 'Pista de baile',
  bar: 'Barra',
  stage: 'Mesa de honor',
  music: 'Banda / DJ',
  entrance: 'Entrada',
  kitchen: 'Cocina / servicio',
  photo: 'Photobooth',
  custom: 'Elemento',
}

/**
 * El color del borde dice cómo va la mesa, como en la maqueta: llena en verde —está
 * resuelta—, empezada en dorado y vacía en línea tenue. El rojo que llevaba la llena
 * decía «problema» donde no lo hay.
 */
/** El tinte de cada elemento del salón, como en la maqueta: pista dorada, mesa de honor
 *  verde, banda violeta, y el resto en blanco translúcido. */
const TONO_ZONA: Record<VenueZone['kind'], string> = {
  dance: 'bg-gold/10',
  stage: 'bg-sage/10',
  music: 'bg-device/10',
  bar: 'bg-white/45',
  entrance: 'bg-white/45',
  kitchen: 'bg-white/45',
  photo: 'bg-white/45',
  custom: 'bg-white/45',
}

const bordeDeMesa = (table: SeatedTable): string => {
  if (table.free === 0) return 'border-sage'
  if (table.taken === 0) return 'border-line-panel'
  return 'border-gold'
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
export function FloorPlan({ eventId, eventSlug, tables, zones, exits, zoneEditHrefPrefix }: Props) {
  const router = useRouter()
  const { termino } = useSeatingSearch()
  const reduceMotion = usePrefiereMenosMovimiento()
  const plano = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ key: string; desdeX: number; desdeY: number; origen: Punto } | null>(null)

  const inicial = posicionesDe(tables, zones)
  const inicialTamanos = tamanosDe(zones)
  const [guardadas, setGuardadas] = useState<Mapa>(inicial)
  const [actuales, setActuales] = useState<Mapa>(inicial)
  const [tamGuardados, setTamGuardados] = useState<Tamanos>(inicialTamanos)
  const [tamActuales, setTamActuales] = useState<Tamanos>(inicialTamanos)
  const estirando = useRef<{ key: string; desdeX: number; desdeY: number; origen: Tamano } | null>(null)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [salida, setSalida] = useState<Exit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Si el servidor devuelve otras posiciones —otra pestaña, un revalidate— se adoptan,
  // pero solo cuando no hay trabajo local sin guardar: pisarlo sería perder el gesto.
  // Ajuste durante el render, no en un efecto: así no hay un fotograma con las
  // posiciones viejas ya pintadas.
  const firmaEntrante = `${firma(inicial)}#${firmaTamanos(inicialTamanos)}`
  const [firmaBase, setFirmaBase] = useState(firmaEntrante)
  const sinCambios = firma(actuales) === firma(guardadas) && firmaTamanos(tamActuales) === firmaTamanos(tamGuardados)
  if (firmaEntrante !== firmaBase && sinCambios) {
    setFirmaBase(firmaEntrante)
    setGuardadas(inicial)
    setActuales(inicial)
    setTamGuardados(inicialTamanos)
    setTamActuales(inicialTamanos)
  }

  const pendientes = Object.keys(actuales).filter(
    (k) =>
      actuales[k]?.x !== guardadas[k]?.x ||
      actuales[k]?.y !== guardadas[k]?.y ||
      tamActuales[k]?.w !== tamGuardados[k]?.w ||
      tamActuales[k]?.h !== tamGuardados[k]?.h,
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

  const alEstirarInicio = (key: string) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const origen = tamActuales[key]
    if (!origen) return
    // El arrastre de la zona no debe empezar también: el mango es suyo.
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    estirando.current = { key, desdeX: e.clientX, desdeY: e.clientY, origen }
  }

  const alEstirar = (e: React.PointerEvent<HTMLSpanElement>) => {
    const activo = estirando.current
    const caja = plano.current?.getBoundingClientRect()
    if (!activo || !caja || caja.width === 0 || caja.height === 0) return
    e.stopPropagation()
    setTamActuales((prev) => ({
      ...prev,
      [activo.key]: {
        w: Math.min(100, Math.max(MINIMO, activo.origen.w + ((e.clientX - activo.desdeX) / caja.width) * 100)),
        h: Math.min(100, Math.max(MINIMO, activo.origen.h + ((e.clientY - activo.desdeY) / caja.height) * 100)),
      },
    }))
  }

  const alSoltarMango = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    estirando.current = null
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

    // Con Mayúsculas, las flechas redimensionan la zona en vez de moverla. Un plano que
    // solo se redimensiona con el ratón deja fuera a quien no usa ratón.
    const tam = tamActuales[key]
    if (e.shiftKey && tam !== undefined) {
      setTamActuales((prev) => ({
        ...prev,
        [key]: {
          w: Math.min(100, Math.max(MINIMO, tam.w + delta.x)),
          h: Math.min(100, Math.max(MINIMO, tam.h + delta.y)),
        },
      }))
      return
    }

    mover(key, { x: origen.x + delta.x, y: origen.y + delta.y })
  }

  const borrarZona = (id: string) => {
    setError(null)
    void removeZoneAction({ id, eventId, eventSlug }).then((r) => {
      // Borrar en silencio dejaría la zona en pantalla y al atelier pulsando otra vez.
      if (!r.ok) setError(r.message ?? 'No se pudo eliminar el elemento.')
    })
  }

  const loteDeCambios = (): ElementMove[] => {
    const moves: ElementMove[] = []
    for (const t of tables) {
      const k = clave('table', t.id)
      if (pendientes.includes(k)) moves.push({ kind: 'table', id: t.id, x: actuales[k]!.x, y: actuales[k]!.y })
    }
    for (const z of zones) {
      const k = clave('zone', z.id)
      if (pendientes.includes(k)) {
        moves.push({
          kind: 'zone',
          id: z.id,
          x: actuales[k]!.x,
          y: actuales[k]!.y,
          w: tamActuales[k]?.w ?? z.w,
          h: tamActuales[k]?.h ?? z.h,
        })
      }
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
      setTamGuardados(tamActuales)
      return true
    } finally {
      setGuardando(false)
    }
  }

  const descartar = () => {
    setError(null)
    setActuales(guardadas)
    setTamActuales(tamGuardados)
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

      <p className="text-[12px] text-ink-mute">
        Arrastra las mesas y los elementos para acomodar el salón · usa la esquina inferior derecha de una zona para
        redimensionarla
      </p>

      {/* La rejilla de fondo de la maqueta. Es un degradado repetido, no doscientos
          `div`s: sirve de guía al colocar y no añade un solo nodo al árbol. */}
      <div
        ref={plano}
        aria-label="Plano del salón"
        className="relative aspect-[4/3] w-full rounded-card border border-line-panel bg-bg-sunken bg-[linear-gradient(to_right,rgb(26_26_26/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(26_26_26/0.05)_1px,transparent_1px)] bg-[length:5%_6.66%]"
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
              style={{
                ...estiloDe(key, arrastrando === key),
                width: `${tamActuales[key]?.w ?? zone.w}%`,
                height: `${tamActuales[key]?.h ?? zone.h}%`,
              }}
              className={`group/zona absolute touch-none rounded-card border border-dashed border-line-panel font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase ${TONO_ZONA[zone.kind]}`}
            >
              {zone.label}

              {/* Editar y eliminar viven **dentro** de la zona, como en la maqueta: se
                  ven al pasar por encima y no obligan a buscar la zona en otra lista. */}
              <span className="absolute -top-2.5 -right-2.5 hidden gap-1 group-hover/zona:flex">
                {zoneEditHrefPrefix === undefined ? null : (
                  <a
                    aria-label={`Editar ${zone.label}`}
                    className="flex size-5 items-center justify-center rounded-full border border-line-panel bg-white text-[10px]"
                    href={`${zoneEditHrefPrefix}${zone.id}`}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    title={`Editar ${zone.label}`}
                  >
                    ✎
                  </a>
                )}
                <span
                  aria-hidden
                  className="flex size-5 items-center justify-center rounded-full border border-line-panel bg-white text-[10px]"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    borrarZona(zone.id)
                  }}
                  role="presentation"
                >
                  ✕
                </span>
              </span>

              {/* El mango de la esquina, como en la maqueta. Es un `span` dentro del
                  botón: un botón dentro de otro botón no es HTML válido, y el teclado
                  ya redimensiona con Mayúsculas + flechas. */}
              <span
                aria-hidden
                className="absolute right-0.5 bottom-0.5 size-3 cursor-nwse-resize rounded-[3px] border border-line-panel-strong bg-white"
                onPointerDown={alEstirarInicio(key)}
                onPointerMove={alEstirar}
                onPointerUp={alSoltarMango}
              />
            </button>
          )
        })}

        {tables.map((table) => {
          const key = clave('table', table.id)
          const sillas = seatRing(table.capacity, table.groups, table.shape)
          const resaltada = matchesSearch(termino, table.groups.map((g) => g.label))
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
                    className={`absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-mono text-[7px] ${
                      silla.occupant === null
                        ? 'border-line-panel bg-bg-top text-ink-mute'
                        : silla.vip
                          ? 'border-gold-deep bg-linear-to-br from-[var(--color-gold-light)] to-gold-deep text-white'
                          : 'border-sage bg-linear-to-br from-[#7a8c64] to-sage text-white'
                    }`}
                    style={{ left: `${silla.x}%`, top: `${silla.y}%` }}
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
                } ${resaltada ? 'ring-4 ring-gold/50' : ''}`}
              >
                #{table.label.replace(/^mesa\s*/i, '') || table.label}
              </span>

              {/* Fondo propio: sin él la etiqueta caía sobre el rótulo de una zona y se
                  leían las dos letras encimadas. */}
              <span
                aria-hidden
                className="absolute top-full left-1/2 -translate-x-1/2 rounded-[6px] bg-bg-sunken/85 px-1.5 py-0.5 text-center whitespace-nowrap"
              >
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
