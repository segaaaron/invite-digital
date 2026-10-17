'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { moveElementsAction, removeZoneAction } from '@/app/_acciones/venue/actions'
import type { SeatedTable } from '../application/list-seating'
import type { ElementMove } from '../application/move-element'
import { matchesSearch, useSeatingSearch } from './SeatingSearchContext'
import { clampToPlan } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'
import type { SeatedGroupRow } from '../application/ports'
import { assignGroupAction, removeTableAction } from '@/app/_acciones/venue/actions'
import { Iniciales, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { TableCard } from './TableCard'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

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
  /** Las invitaciones sin mesa: la columna «Sin mesa», que se arrastran a una mesa. */
  unseated?: readonly SeatedGroupRow[]
  /** Cómo se llama la mesa principal en esta fiesta. */
  mesaPrincipal?: string | undefined
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

const zonaTexto = (t: T): Record<VenueZone['kind'], string> => ({
  dance: t('Pista de baile', 'Dance floor'),
  bar: t('Barra', 'Bar'),
  stage: t('Mesa de honor', 'Head table'),
  music: t('Banda / DJ', 'Band / DJ'),
  entrance: t('Entrada', 'Entrance'),
  kitchen: t('Cocina / servicio', 'Kitchen / service'),
  photo: t('Photobooth', 'Photo booth'),
  custom: t('Elemento', 'Element'),
})

/**
 * El color del borde dice cómo va la mesa, como en la maqueta: llena en verde —está
 * resuelta—, empezada en dorado y vacía en línea tenue. El rojo que llevaba la llena
 * decía «problema» donde no lo hay.
 */
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

/** El botón «Guardar el plano» vive en la cabecera de la página y el plano dentro: se hablan por estos avisos. */
const PLANO_ESTADO = 'venue:plano-estado'
const PLANO_GUARDAR = 'venue:plano-guardar'

/** «Guardar el plano» (E10), en la cabecera: activo solo con cambios sin guardar. */
export function GuardarPlano() {
  const t = useT()
  const [estado, setEstado] = useState({ pendientes: 0, guardando: false })
  useEffect(() => {
    const oir = (e: Event) => setEstado((e as CustomEvent<{ pendientes: number; guardando: boolean }>).detail)
    window.addEventListener(PLANO_ESTADO, oir)
    return () => window.removeEventListener(PLANO_ESTADO, oir)
  }, [])
  return (
    <PanelButton disabled={estado.pendientes === 0 || estado.guardando} onClick={() => window.dispatchEvent(new Event(PLANO_GUARDAR))} variant="primary">
      {t('Guardar el plano', 'Save floor plan')}
    </PanelButton>
  )
}

/** «Mesa 06» → «6»; «Novios» se queda. */
const numeroDe = (label: string): string => {
  const sin = label.replace(/^mesa\s*/i, '')
  return /^\d+$/.test(sin) ? String(Number(sin)) : sin || label
}

/** Un toque sin arrastre (menos de esto en píxeles) elige la mesa. */
const TOQUE = 4

/**
 * El plano no guarda al arrastrar ni al soltar: acumula los movimientos en local y los
 * manda en un solo lote cuando el atelier pulsa «Guardar». Guardar por fotograma serían
 * miles de escrituras por cada mesa que alguien mueve, y guardar al soltar deja al
 * atelier sin forma de deshacer una recolocación entera.
 *
 * Se mueve con el ratón y con las flechas del teclado. Un plano solo arrastrable deja
 * fuera a quien no usa ratón.
 */
export function FloorPlan({ eventId, eventSlug, tables, zones, exits, zoneEditHrefPrefix, unseated = [], mesaPrincipal }: Props) {
  const t = useT()
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
  const [elegida, setElegida] = useState<string | null>(null)
  const [encima, setEncima] = useState<string | null>(null)
  const [porQuitar, setPorQuitar] = useState(false)
  const [viendo, setViendo] = useState(false)
  /**
   * **A pantalla completa, con zoom** (7 de octubre, fase 4 del panel móvil): en el teléfono el plano de
   * 760 px de alto no se veía entero ni se acercaba. Pellizcar acerca y aleja el plano, no la página
   * (`touch-action: pan-x pan-y`); las mesas se siguen arrastrando con un dedo.
   */
  const [completo, setCompleto] = useState(false)
  const [zoom, setZoom] = useState(1)
  const pellizco = useRef<{ distancia: number; zoom: number } | null>(null)
  const acotar = (z: number) => Math.min(3, Math.max(1, Math.round(z * 100) / 100))
  const distancia = (tl: React.TouchList) => {
    const [a, b] = [tl[0], tl[1]]
    return a === undefined || b === undefined ? 0 : Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PLANO_ESTADO, { detail: { pendientes: pendientes.length, guardando } }))
  }, [pendientes.length, guardando])

  const guardarRef = useRef<() => Promise<boolean>>(async () => false)
  useEffect(() => {
    const oir = () => void guardarRef.current()
    window.addEventListener(PLANO_GUARDAR, oir)
    return () => window.removeEventListener(PLANO_GUARDAR, oir)
  }, [])

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
    const activo = arrastre.current
    if (activo?.key.startsWith('table:') && Math.hypot(e.clientX - activo.desdeX, e.clientY - activo.desdeY) < TOQUE) {
      elegir(activo.key.slice('table:'.length))
    }
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

  const elegir = (id: string) => {
    setElegida(id)
    setPorQuitar(false)
    setViendo(false)
  }

  /** Soltar una invitación de «Sin mesa» encima de una mesa la sienta ahí. */
  const sentar = (tableId: string, groupId: string) => {
    setError(null)
    void assignGroupAction({ eventId, eventSlug, groupId, tableId }).then((r) => {
      if (!r.ok) setError(r.message ?? t('No se pudo sentar a esa invitación.', 'Could not seat that invitation.'))
    })
  }

  const quitarMesa = (id: string) => {
    setError(null)
    void removeTableAction({ id, eventId, eventSlug }).then((r) => {
      if (!r.ok) setError(r.message ?? t('No se pudo quitar la mesa.', 'Could not remove the table.'))
      else setElegida(null)
    })
  }

  const borrarZona = (id: string) => {
    setError(null)
    void removeZoneAction({ id, eventId, eventSlug }).then((r) => {
      // Borrar en silencio dejaría la zona en pantalla y al atelier pulsando otra vez.
      if (!r.ok) setError(r.message ?? t('No se pudo eliminar el elemento.', 'Could not remove the element.'))
    })
  }

  const loteDeCambios = (): ElementMove[] => {
    const moves: ElementMove[] = []
    for (const m of tables) {
      const k = clave('table', m.id)
      if (pendientes.includes(k)) moves.push({ kind: 'table', id: m.id, x: actuales[k]!.x, y: actuales[k]!.y })
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
        setError(r.message ?? t('No se pudo guardar el plano.', 'Could not save the floor plan.'))
        return false
      }
      setGuardadas(actuales)
      setTamGuardados(tamActuales)
      return true
    } finally {
      setGuardando(false)
    }
  }

  useEffect(() => {
    guardarRef.current = guardar
  })

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

  const mesa = tables.find((m) => m.id === elegida) ?? null
  const quienes = (m: SeatedTable) => {
    const nombres = m.groups.map((g) => `${g.label} (${g.seats})`)
    return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} ${t('y', 'and')} ${nombres[nombres.length - 1]}`
  }

  return (
    <section
      aria-label={completo ? t('Plano del salón a pantalla completa', 'Full-screen floor plan') : undefined}
      className={completo ? 'fixed inset-0 z-[70] flex flex-col gap-3 bg-bg px-3 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),12px)]' : 'flex flex-col gap-4'}
    >
      <div className={`grid items-start gap-6 ${unseated.length === 0 || completo ? '' : 'min-[1100px]:grid-cols-[230px_minmax(0,1fr)]'}`}>
        {unseated.length === 0 || completo ? null : (
          // La columna «Sin mesa» de la maqueta (E10): cada invitación se arrastra entera a una mesa.
          <section aria-label={t('Invitados sin mesa', 'Unseated guests')} className="flex flex-col gap-3">
            <h2 className="font-display text-[24px] leading-tight font-medium">
              {t('Sin mesa', 'Unseated')} <span className="text-[18px] text-ink-mute">{unseated.reduce((n, g) => n + g.seats, 0)}</span>
            </h2>
            <p className="text-[13.5px] text-ink-mute">{t('Arrástralos a una mesa. Una familia nunca se parte.', 'Drag them to a table. A family is never split.')}</p>
            <ul className="flex flex-col gap-2.5 max-[1099px]:flex-row max-[1099px]:flex-wrap">
              {unseated.map((g) => (
                <li
                  className="flex cursor-grab items-center gap-3 rounded-[12px] border border-line-panel bg-tarjeta px-3.5 py-3 active:cursor-grabbing"
                  draggable
                  key={g.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/x-invitacion', g.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                >
                  <Iniciales chico nombre={g.label} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[14.5px] font-medium">{g.label}</span>
                    <span className="text-[13px] text-ink-mute">
                      {g.seats} {g.seats === 1 ? t('persona', 'person') : t('personas', 'people')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex min-h-9 items-center rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[13px] text-ink max-[859px]:min-h-11"
              onClick={() => {
                setCompleto((v) => !v)
                setZoom(1)
              }}
              type="button"
            >
              {completo ? t('Cerrar pantalla completa', 'Exit full screen') : t('Pantalla completa', 'Full screen')}
            </button>
            {completo ? (
              <span className="inline-flex items-center gap-1" role="group" aria-label={t('Zoom del plano', 'Floor plan zoom')}>
                <button aria-label={t('Alejar', 'Zoom out')} className="grid size-11 place-items-center rounded-full border border-line-panel-strong bg-bg-raised text-[18px] disabled:opacity-40" disabled={zoom <= 1} onClick={() => setZoom((z) => acotar(z - 0.5))} type="button">
                  −
                </button>
                <span className="w-12 text-center text-[12px] text-ink-soft">{`${Math.round(zoom * 100)} %`}</span>
                <button aria-label={t('Acercar', 'Zoom in')} className="grid size-11 place-items-center rounded-full border border-line-panel-strong bg-bg-raised text-[18px] disabled:opacity-40" disabled={zoom >= 3} onClick={() => setZoom((z) => acotar(z + 0.5))} type="button">
                  +
                </button>
              </span>
            ) : null}
            {exits.map((exit) => (
              <a
                className="ml-auto text-[13px] text-ink-mute max-[859px]:inline-flex max-[859px]:min-h-11 max-[859px]:items-center"
                href={exit.href}
                key={exit.href}
                onClick={(e) => {
                  e.preventDefault()
                  intentarSalir(exit)
                }}
              >
                {exit.label}
              </a>
            ))}
          </div>

          {/* La rejilla de puntos de la maqueta: un degradado repetido, ni un nodo de más. */}
          <div
            className={completo ? 'min-h-0 flex-1 overflow-auto rounded-[16px] [touch-action:pan-x_pan-y]' : ''}
            onTouchEnd={() => {
              pellizco.current = null
            }}
            onTouchMove={(e) => {
              if (!completo || e.touches.length !== 2 || pellizco.current === null) return
              const inicio = pellizco.current
              setZoom(acotar((inicio.zoom * distancia(e.touches)) / Math.max(1, inicio.distancia)))
            }}
            onTouchStart={(e) => {
              if (completo && e.touches.length === 2) pellizco.current = { distancia: distancia(e.touches), zoom }
            }}
          >
            <div
              ref={plano}
              aria-label={t('Plano del salón', 'Floor plan')}
              style={completo ? { width: `${zoom * 100}%`, height: `calc((100dvh - 120px) * ${zoom})` } : undefined}
              className="plano-del-salon relative h-[520px] w-full overflow-hidden rounded-[16px] border border-line-panel bg-tarjeta bg-[radial-gradient(circle,var(--color-line-panel-strong)_1px,transparent_1.4px)] bg-[length:22px_22px] max-[767px]:h-[440px]"
            >
              {zones.map((zone) => {
                const key = clave('zone', zone.id)
                return (
                  <span className="group/zona" key={key}>
                    <button
                      aria-label={`${zonaTexto(t)[zone.kind]}: ${zone.label}. ${t('Muévela con las flechas.', 'Move it with the arrow keys.')}`}
                      className="absolute grid touch-none place-items-center rounded-[10px] border border-dashed border-gold/70 p-1 text-[12.5px] text-gold-deep"
                      onKeyDown={alTeclear(key)}
                      onPointerDown={alPulsar(key)}
                      onPointerMove={alArrastrar}
                      onPointerUp={alSoltar}
                      style={{
                        ...estiloDe(key, arrastrando === key),
                        width: `${tamActuales[key]?.w ?? zone.w}%`,
                        height: `${tamActuales[key]?.h ?? zone.h}%`,
                      }}
                      type="button"
                    >
                      {zone.label}
                      {/* El mango de la esquina; un botón dentro de otro no es HTML válido, y el teclado redimensiona con Mayúsculas + flechas. */}
                      <span
                        aria-hidden
                        className="absolute right-0.5 bottom-0.5 size-3 cursor-nwse-resize border-r-2 border-b-2 border-gold/60 opacity-50"
                        onPointerDown={alEstirarInicio(key)}
                        onPointerMove={alEstirar}
                        onPointerUp={alSoltarMango}
                      />
                    </button>
                    <span
                      className="absolute z-10 flex gap-1 opacity-0 transition-opacity group-hover/zona:opacity-100 focus-within:opacity-100"
                      style={{
                        left: `calc(${actuales[key]?.x ?? 0}% + ${tamActuales[key]?.w ?? zone.w}% - 18px)`,
                        top: `calc(${actuales[key]?.y ?? 0}% - 10px)`,
                      }}
                    >
                      {zoneEditHrefPrefix === undefined ? null : (
                        <a
                          aria-label={t(`Editar ${zone.label}`, `Edit ${zone.label}`)}
                          className="flex size-6 items-center justify-center rounded-full border border-line-panel bg-bg-raised text-[12px] max-[859px]:size-8 max-[859px]:text-[13px]"
                          href={`${zoneEditHrefPrefix}${zone.id}`}
                          title={t(`Editar ${zone.label}`, `Edit ${zone.label}`)}
                        >
                          ✎
                        </a>
                      )}
                      <button
                        aria-label={t(`Eliminar ${zone.label}`, `Remove ${zone.label}`)}
                        className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-bg-raised text-[12px] max-[859px]:size-8 max-[859px]:text-[13px]"
                        onClick={() => borrarZona(zone.id)}
                        title={t(`Eliminar ${zone.label}`, `Remove ${zone.label}`)}
                        type="button"
                      >
                        <span aria-hidden>✕</span>
                      </button>
                    </span>
                  </span>
                )
              })}

              {tables.map((table) => {
                const key = clave('table', table.id)
                const resaltada = matchesSearch(termino, table.groups.map((g) => g.label))
                const redonda = table.shape === 'round'
                const borde = table.free === 0 ? 'border-[1.5px] border-shell-deep' : table.taken > 0 ? 'border-gold' : 'border-line-panel-strong'
                const marcada = elegida === table.id || encima === table.id || resaltada
                return (
                  <button
                    aria-label={t(
                      `${table.label}: ${table.taken} de ${table.capacity} sitios${table.groups.length === 0 ? ' y nadie sentado' : `. Se sientan ${table.groups.map((g) => g.label).join(', ')}`}. Muévela con las flechas.`,
                      `${table.label}: ${table.taken} of ${table.capacity} seats${table.groups.length === 0 ? ' and nobody seated' : `. Seated: ${table.groups.map((g) => g.label).join(', ')}`}. Move it with the arrow keys.`,
                    )}
                    aria-pressed={elegida === table.id}
                    className={`absolute grid -translate-x-1/2 -translate-y-1/2 touch-none place-items-center border bg-tarjeta text-ink transition-shadow ${borde} ${
                      redonda ? 'size-[76px] rounded-full' : 'h-[58px] w-[118px] rounded-[10px]'
                    } ${marcada ? 'shadow-[0_0_0_4px_var(--color-tarjeta),0_0_0_6px_var(--color-gold)]' : ''}`}
                    key={key}
                    onDragLeave={() => setEncima(null)}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes('text/x-invitacion')) return
                      e.preventDefault()
                      setEncima(table.id)
                    }}
                    onDrop={(e) => {
                      const grupo = e.dataTransfer.getData('text/x-invitacion')
                      setEncima(null)
                      if (grupo === '') return
                      e.preventDefault()
                      sentar(table.id, grupo)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        elegir(table.id)
                        return
                      }
                      alTeclear(key)(e)
                    }}
                    onPointerDown={alPulsar(key)}
                    onPointerMove={alArrastrar}
                    onPointerUp={alSoltar}
                    style={estiloDe(key, arrastrando === key)}
                    type="button"
                  >
                    <span aria-hidden className="flex flex-col items-center leading-none">
                      <span className={`font-display font-medium ${redonda ? 'text-[26px]' : 'text-[20px]'}`}>{numeroDe(table.label)}</span>
                      <span className="mt-1 text-[12px] text-ink-mute [font-variant-numeric:tabular-nums]">
                        {table.taken}/{table.capacity}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* La mesa elegida (E10): quién se sienta, cuántas sillas quedan, cambiarla o quitarla. */}
          {mesa === null || completo ? (
            completo || tables.length === 0 ? null : <p className="px-1 text-[13.5px] text-ink-mute">{t('Toca una mesa para ver quién se sienta y cambiarla.', 'Tap a table to see who sits there and change it.')}</p>
          ) : (
            <section aria-label={t(`Mesa elegida: ${mesa.label}`, `Selected table: ${mesa.label}`)} className="flex flex-col gap-4 rounded-[16px] border border-line-panel bg-tarjeta px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-[15.5px] font-medium">
                    {mesa.label}
                    {mesa.notes ? `, ${mesa.notes}` : mesa.shape === 'sweetheart' ? `, ${(mesaPrincipal ?? t('De los novios', 'Sweetheart')).toLowerCase()}` : ''}
                  </p>
                  <p className="text-[13.5px] text-ink-mute">
                    {mesa.groups.length === 0 ? t('Nadie sentado todavía.', 'Nobody seated yet.') : `${quienes(mesa)}.`}{' '}
                    {mesa.free === 0 ? t('Está completa.', 'It is full.') : t(`Quedan ${mesa.free} ${mesa.free === 1 ? 'silla' : 'sillas'}.`, `${mesa.free} ${mesa.free === 1 ? 'seat' : 'seats'} left.`)}
                  </p>
                </div>
                <PanelButton onClick={() => setViendo((v) => !v)} size="sm">
                  {viendo ? t('Cerrar', 'Close') : t('Cambiar nombre o sillas', 'Change name or seats')}
                </PanelButton>
                {porQuitar ? (
                  <span className="flex items-center gap-2 text-[13.5px]">
                    {t('¿Quitarla?', 'Remove it?')} {mesa.groups.length === 0 ? '' : t('Sus invitados quedan sin mesa.', 'Its guests will be left without a table.')}
                    <PanelButton onClick={() => quitarMesa(mesa.id)} size="sm" variant="danger">
                      {t('Sí, quitar', 'Yes, remove')}
                    </PanelButton>
                    <PanelButton onClick={() => setPorQuitar(false)} size="sm">
                      {t('No', 'No')}
                    </PanelButton>
                  </span>
                ) : (
                  <button className="cursor-pointer text-[14px] font-medium text-danger-deep hover:underline" onClick={() => setPorQuitar(true)} type="button">
                    {t('Quitar mesa', 'Remove table')}
                  </button>
                )}
              </div>
              {viendo ? <TableCard eventId={eventId} eventSlug={eventSlug} key={mesa.id} mesaPrincipal={mesaPrincipal} table={mesa} unseated={unseated} /> : null}
            </section>
          )}
        </div>
      </div>

      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p aria-label={t('Estado del plano', 'Floor plan status')} className="flex-1 text-[14px] text-ink-mute" role="status">
          {hayPendientes
            ? t(`Tienes ${pendientes.length} cambio${pendientes.length === 1 ? '' : 's'} sin guardar. Si sales, te preguntamos antes.`, `You have ${pendientes.length} unsaved change${pendientes.length === 1 ? '' : 's'}. We will ask before you leave.`)
            : t('Plano guardado', 'Floor plan saved')}
        </p>
        {hayPendientes ? (
          <PanelButton disabled={guardando} onClick={descartar} size="sm">
            {t('Descartar', 'Discard')}
          </PanelButton>
        ) : null}
      </div>

      {salida === null ? null : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Cambios sin guardar', 'Unsaved changes')}
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6"
        >
          {/* Modal propio, no `window.confirm`: el diálogo nativo no se puede estilar,
              bloquea el hilo y queda fuera del idioma visual del panel. */}
          <div className="flex w-[min(420px,92vw)] flex-col gap-4 rounded-card bg-bg-raised p-6 shadow-float">
            <h2 className="font-display text-[22px] font-light text-ink">{t('Tienes el plano a medias', 'Your floor plan is half done')}</h2>
            <p className="text-[13px] text-ink-soft">
              {t(
                `${pendientes.length} cambio${pendientes.length === 1 ? '' : 's'} sin guardar. Si sales ahora, se ${pendientes.length === 1 ? 'pierde' : 'pierden'}.`,
                `${pendientes.length} unsaved change${pendientes.length === 1 ? '' : 's'}. If you leave now, ${pendientes.length === 1 ? 'it is' : 'they are'} lost.`,
              )}
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
                className="rounded-pill border border-ok px-4 py-2 font-mono text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ok disabled:opacity-40"
              >
                {t('Guardar', 'Save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const destino = salida.href
                  descartar()
                  setSalida(null)
                  router.push(destino)
                }}
                className="rounded-pill border border-line px-4 py-2 max-[859px]:min-h-11 font-mono text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
              >
                {t('Descartar y salir', 'Discard and leave')}
              </button>
              <button
                type="button"
                onClick={() => setSalida(null)}
                className="ml-auto rounded-pill bg-ink px-4 py-2 font-mono text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-top"
              >
                {t('Cancelar', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
