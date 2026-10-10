import Link from 'next/link'
import type { ReactNode } from 'react'
import { CalendarIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import type { ClaseDeAgenda, EntradaDeAgenda } from '../domain/agenda'
import { NOMBRE_DE_CLASE } from '../domain/agenda'

/** Cada clase con su color de la paleta, y siempre con su nombre al lado: el color acompaña, no dice. */
export const TONO: Record<ClaseDeAgenda, string> = {
  evento: 'bg-gold text-on-gold',
  confirmacion: 'bg-ink text-white',
  // Claro con tinta oscura, como las píldoras: el verde salvia lleno no dejaba leer el título en el mes.
  tarea: 'bg-pill-ok text-pill-ok-ink',
  pago: 'bg-pill-maybe text-pill-maybe-ink',
  momento: 'bg-gold-light text-gold-deep',
  ensayo: 'bg-pill-pending text-pill-pending-ink',
  cita: 'bg-bg-top text-ink ring-1 ring-line-panel-strong',
}
/** Lo atrasado, en vino y con su palabra (9 oct): se ve igual en el mes, la lista y el celular. */
const ATRASADA = 'bg-pill-no text-pill-no-ink'
/** El punto de cada clase (leyenda y celular): lleno y con contraste, también el de las citas, cuyo fondo es blanco. */
const PUNTO: Record<ClaseDeAgenda, string> = {
  evento: 'bg-gold',
  confirmacion: 'bg-ink',
  tarea: 'bg-ok',
  pago: 'bg-pill-maybe-ink',
  momento: 'bg-gold-light',
  ensayo: 'bg-pill-pending-ink',
  cita: 'bg-ink-soft',
}
const punto = (clase: ClaseDeAgenda) => PUNTO[clase]

/** Solo tareas y pagos se atrasan: una cita que pasó, pasó. */
export const estaAtrasada = (e: EntradaDeAgenda, hoy: string) => !e.hecha && e.dia < hoy && (e.clase === 'tarea' || e.clase === 'pago')

/** Lo que se puede ocultar. El evento y el cierre de confirmaciones se ven siempre: son el esqueleto del plan. */
export const CLASES_FILTRABLES: readonly ClaseDeAgenda[] = ['tarea', 'pago', 'cita', 'ensayo', 'momento']
const EN_PLURAL: Record<ClaseDeAgenda, string> = {
  evento: 'El evento',
  confirmacion: 'Confirmaciones',
  tarea: 'Tareas',
  pago: 'Pagos',
  momento: 'Cronograma',
  ensayo: 'Ensayos',
  cita: 'Citas',
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const nombreDelMes = (mes: string) => {
  const [a, m] = mes.split('-')
  return `${MESES[Number(m) - 1]} ${a}`
}

/** «mar 14 oct» para la lista. */
export function diaCorto(dia: string): string {
  const fecha = new Date(`${dia}T12:00:00Z`)
  return `${SEMANA[fecha.getUTCDay()]!.slice(0, 3)} ${fecha.getUTCDate()} ${MESES[fecha.getUTCMonth()]!.slice(0, 3)}`
}

/** «jueves 9 de octubre», para el título del día. */
export function diaLargo(dia: string): string {
  const fecha = new Date(`${dia}T12:00:00Z`)
  return `${SEMANA[fecha.getUTCDay()]} ${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()]}`
}

const masUnDia = (dia: string) => new Date(Date.parse(`${dia}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
/** «Hoy», «Mañana» o el día, para encabezar un grupo de la lista. */
const rotuloDelDia = (dia: string, hoy: string) => (dia === hoy ? `Hoy · ${diaCorto(dia)}` : dia === masUnDia(hoy) ? `Mañana · ${diaCorto(dia)}` : diaCorto(dia))

/**
 * La leyenda **es** el filtro (9 oct): cada clase con su punto de color; tocarla la oculta o la vuelve a
 * mostrar. Vive en la URL (`?ocultar=`), como el resto del estado del panel.
 */
export function FiltrosDeAgenda({ ocultas, enlace }: { ocultas: readonly ClaseDeAgenda[]; enlace: (ocultas: readonly ClaseDeAgenda[]) => string }) {
  return (
    <nav aria-label="Qué se ve en la agenda" className="flex flex-wrap items-center gap-1.5">
      {CLASES_FILTRABLES.map((clase) => {
        const oculta = ocultas.includes(clase)
        const siguiente = oculta ? ocultas.filter((c) => c !== clase) : [...ocultas, clase]
        return (
          <Link
            aria-label={`${oculta ? 'Mostrar' : 'Ocultar'} ${EN_PLURAL[clase].toLowerCase()}`}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-[12px] transition-colors max-[859px]:min-h-11 ${
              oculta ? 'border-dashed border-line-panel-strong text-ink-mute line-through' : 'border-line-panel bg-white text-ink-soft hover:border-ink'
            }`}
            href={enlace(siguiente)}
            key={clase}
            scroll={false}
          >
            <span aria-hidden className={`size-2 rounded-full ${oculta ? 'bg-line-panel-strong' : punto(clase)}`} />
            {EN_PLURAL[clase]}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * La vista de mes: cada casilla con sus entradas (tres y «+N más», que abre el día: nada se esconde). En el
 * celular, puntos de color. Hoy lleva su círculo de tinta; el día del evento, el dorado; lo que ya pasó se
 * atenúa y lo atrasado va en vino.
 */
export function MesDeAgenda({
  semanas,
  entradas,
  hoy,
  diaDelEvento,
  enlaceDelDia,
}: {
  semanas: (string | null)[][]
  entradas: readonly EntradaDeAgenda[]
  hoy: string
  diaDelEvento: string
  enlaceDelDia: (dia: string) => string
}) {
  const porDia = new Map<string, EntradaDeAgenda[]>()
  for (const e of entradas) porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), e])
  return (
    <div className="overflow-hidden rounded-[14px] border border-line-panel">
      <div className="grid grid-cols-7 border-b border-line-panel bg-bg-top/60">
        {DIAS.map((d) => (
          <span className="px-2 py-2 text-center text-[10.5px] font-medium tracking-[0.1em] text-ink-mute uppercase" key={d}>
            {d}
          </span>
        ))}
      </div>
      {semanas.map((semana, i) => (
        <div className="grid grid-cols-7 border-b border-line-panel last:border-b-0" key={i}>
          {semana.map((dia, j) => {
            if (dia === null) return <span aria-hidden className="min-h-16 border-r border-line-panel bg-bg-top/30 last:border-r-0 min-[700px]:min-h-26" key={j} />
            const delDia = porDia.get(dia) ?? []
            const atrasadas = delDia.filter((e) => estaAtrasada(e, hoy)).length
            const esHoy = dia === hoy
            const esElEvento = dia === diaDelEvento
            const pasado = dia < hoy
            const etiqueta = [diaCorto(dia), esHoy ? 'hoy' : null, esElEvento ? 'el día del evento' : null, delDia.length === 0 ? null : `${delDia.length} en la agenda`, atrasadas === 0 ? null : `${atrasadas} atrasada${atrasadas === 1 ? '' : 's'}`]
              .filter(Boolean)
              .join(', ')
            return (
              <Link
                aria-label={etiqueta}
                className={`group flex min-h-16 flex-col gap-1 border-r border-line-panel p-1.5 transition-colors last:border-r-0 hover:bg-bg-top focus-visible:relative focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-ink min-[700px]:min-h-26 ${
                  pasado ? 'bg-bg-top/40' : 'bg-white'
                }`}
                href={enlaceDelDia(dia)}
                key={j}
                scroll={false}
              >
                <span
                  className={`grid size-6.5 place-items-center rounded-full font-display text-[14px] lining-nums tabular-nums ${
                    esElEvento ? 'bg-gold text-on-gold ring-2 ring-gold-light ring-offset-1' : esHoy ? 'bg-ink text-white' : pasado ? 'text-ink-mute' : 'text-ink-soft'
                  }`}
                >
                  {Number(dia.slice(8))}
                </span>
                {/* Celular: puntos. */}
                <span className="flex flex-wrap gap-0.5 min-[700px]:hidden">
                  {delDia.slice(0, 4).map((e) => (
                    <span aria-hidden className={`size-1.5 rounded-full ${estaAtrasada(e, hoy) ? 'bg-pill-no-ink' : punto(e.clase)} ${e.hecha ? 'opacity-40' : ''}`} key={`${e.clase}-${e.id}`} />
                  ))}
                </span>
                {/* Pantalla ancha: las tres primeras con su texto. */}
                <span className="hidden min-w-0 flex-col gap-0.5 min-[700px]:flex">
                  {delDia.slice(0, 3).map((e) => (
                    <span
                      className={`truncate rounded-[5px] px-1.5 py-0.5 text-[10.5px] leading-tight ${estaAtrasada(e, hoy) ? ATRASADA : TONO[e.clase]} ${e.hecha ? 'line-through opacity-50' : pasado ? 'opacity-70' : ''}`}
                      key={`${e.clase}-${e.id}`}
                    >
                      {e.hora === null ? '' : `${e.hora} `}
                      {e.titulo}
                    </span>
                  ))}
                  {delDia.length > 3 ? <span className="px-1 text-[10.5px] font-medium text-ink-soft group-hover:text-ink">+{delDia.length - 3} más</span> : null}
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Una fila: hora, qué y su clase (o «Atrasado»), y a la derecha lo que se puede hacer sin salir de la agenda. */
function Fila({ e, hoy, enlace, accion, vencio = false }: { e: EntradaDeAgenda; hoy: string; enlace: string; accion?: ReactNode; vencio?: boolean }) {
  const atrasada = estaAtrasada(e, hoy)
  const tono = atrasada ? ATRASADA : TONO[e.clase]
  const nombre = atrasada ? 'Atrasado' : NOMBRE_DE_CLASE[e.clase]
  return (
    <li className="flex items-center gap-2 rounded-[12px] border border-line-panel bg-white transition-colors hover:border-line-panel-strong">
      <Link className="flex min-h-11 min-w-0 flex-1 items-start gap-3 px-3 py-2.5" href={enlace}>
        <span className="w-11 shrink-0 pt-0.5 text-[12px] text-ink-soft tabular-nums max-[559px]:w-9">{e.hora ?? '—'}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`text-[13.5px] leading-snug text-ink ${e.hecha ? 'line-through opacity-60' : ''}`}>{e.titulo}</span>
          {vencio || e.detalle ? (
            <span className="truncate text-[12px] text-ink-mute">{[vencio ? `venció el ${diaCorto(e.dia)}` : null, e.detalle].filter(Boolean).join(' · ')}</span>
          ) : null}
          {/* Celular: el tipo bajo el título, para que el botón quepa a la derecha. */}
          <span className={`w-fit rounded-full px-2 py-0.5 text-[10.5px] min-[560px]:hidden ${tono}`}>{nombre}</span>
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] max-[559px]:hidden ${tono}`}>{nombre}</span>
      </Link>
      {accion ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 pr-2 max-[559px]:max-w-[52%]">{accion}</div> : null}
    </li>
  )
}

/** Una lista de entradas, agrupada por día («Hoy», «Mañana»…). Cada una lleva a donde se edita. */
export function ListaDeAgenda({
  entradas,
  enlace,
  vacio,
  hoy,
  accion,
  agrupar = true,
}: {
  entradas: readonly EntradaDeAgenda[]
  enlace: (e: EntradaDeAgenda) => string
  vacio: { titulo: string; texto?: string; accion?: ReactNode }
  hoy: string
  accion?: (e: EntradaDeAgenda) => ReactNode
  agrupar?: boolean
}) {
  if (entradas.length === 0) return <EmptyState action={vacio.accion} compact description={vacio.texto} icon={<CalendarIcon />} title={vacio.titulo} />
  const filas = (lista: readonly EntradaDeAgenda[]) => (
    <ul className="flex flex-col gap-1.5">
      {lista.map((e) => (
        <Fila accion={accion?.(e)} e={e} enlace={enlace(e)} hoy={hoy} key={`${e.clase}-${e.id}`} />
      ))}
    </ul>
  )
  if (!agrupar) return filas(entradas)
  const dias = [...new Set(entradas.map((e) => e.dia))]
  return (
    <ol className="flex flex-col gap-4">
      {dias.map((dia) => (
        <li className="flex flex-col gap-1.5" key={dia}>
          <p className={`text-[11px] font-medium tracking-[0.1em] uppercase ${dia === hoy ? 'text-ink' : 'text-ink-mute'}`}>{rotuloDelDia(dia, hoy)}</p>
          {filas(entradas.filter((e) => e.dia === dia))}
        </li>
      ))}
    </ol>
  )
}

/** Lo atrasado, lo más viejo primero, con cuándo venció y su salida rápida al lado. */
export function ListaDeAtrasadas({ entradas, hoy, enlace, accion }: { entradas: readonly EntradaDeAgenda[]; hoy: string; enlace: (e: EntradaDeAgenda) => string; accion: (e: EntradaDeAgenda) => ReactNode }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {entradas.map((e) => (
        <Fila accion={accion(e)} e={e} enlace={enlace(e)} hoy={hoy} key={`${e.clase}-${e.id}`} vencio />
      ))}
    </ul>
  )
}
