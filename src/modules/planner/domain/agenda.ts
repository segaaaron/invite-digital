import type { Momento } from './cronograma'
import type { Ensayo } from './equipo-del-dia'
import type { Partida } from './presupuesto'
import { sumarDias, type Tarea } from './tareas'

/** Una cita de la agenda: lo que no es tarea, pago ni momento. Hora de Bolivia sin zona. */
export type Cita = {
  readonly id: string
  readonly title: string
  /** `YYYY-MM-DDTHH:MM`, Bolivia. */
  readonly startsAt: string
  readonly durationMin: number
  readonly place: string | null
  readonly vendorId: string | null
  readonly notes: string | null
}

export type ClaseDeAgenda = 'evento' | 'confirmacion' | 'tarea' | 'pago' | 'momento' | 'ensayo' | 'cita'

export type EntradaDeAgenda = {
  readonly id: string
  readonly clase: ClaseDeAgenda
  /** `YYYY-MM-DD`. */
  readonly dia: string
  /** `HH:MM`, o `null` si es de día entero. */
  readonly hora: string | null
  readonly minutos: number | null
  readonly titulo: string
  readonly detalle: string | null
  /** Tarea cerrada o pago hecho: se ve tachado y no va a la suscripción. */
  readonly hecha: boolean
  /** Dónde se edita, relativo a `/panel/eventos/<slug>`. */
  readonly ruta: string
}

export const NOMBRE_DE_CLASE: Record<ClaseDeAgenda, string> = {
  evento: 'El evento',
  confirmacion: 'Cierre de confirmaciones',
  tarea: 'Tarea',
  pago: 'Pago',
  momento: 'Cronograma',
  ensayo: 'Ensayo',
  cita: 'Cita',
}

const BOLIVIA_MS = 4 * 3_600_000
/** Un instante guardado con zona (los ensayos) a la hora de Bolivia. */
const aBolivia = (instante: Date) => new Date(instante.getTime() - BOLIVIA_MS).toISOString().slice(0, 16)

const bs = (cents: number) => `Bs ${(cents / 100).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`

/**
 * **Todo lo que tiene fecha en un solo calendario** (29 de septiembre): el día del evento, el cierre de
 * confirmaciones, las tareas, los pagos, los momentos del cronograma, los ensayos y las citas. No guarda
 * nada propio salvo las citas: cada cosa sigue viviendo en su pantalla y la agenda la lee. Ordenada por día
 * y hora; las de día entero, primero.
 */
export function componerAgenda(datos: {
  readonly evento: { readonly title: string; readonly eventDate: string; readonly rsvpDeadline: string; readonly inicio: string | null }
  readonly tareas: readonly Tarea[]
  readonly partidas: readonly Partida[]
  readonly momentos: readonly Momento[]
  readonly ensayos: readonly Ensayo[]
  readonly citas: readonly Cita[]
}): EntradaDeAgenda[] {
  const { evento } = datos
  const hora = evento.inicio !== null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(evento.inicio) ? evento.inicio.slice(11, 16) : null
  const entradas: EntradaDeAgenda[] = [
    { id: 'evento', clase: 'evento', dia: evento.eventDate, hora, minutos: hora === null ? null : 300, titulo: evento.title, detalle: null, hecha: false, ruta: '' },
    { id: 'confirmacion', clase: 'confirmacion', dia: evento.rsvpDeadline, hora: null, minutos: null, titulo: 'Último día para confirmar', detalle: null, hecha: false, ruta: '/invitados' },
  ]
  for (const t of datos.tareas) {
    if (t.dueDate === null) continue
    entradas.push({ id: t.id, clase: 'tarea', dia: t.dueDate, hora: null, minutos: null, titulo: t.title, detalle: null, hecha: t.doneAt !== null, ruta: '/planner/tareas' })
  }
  for (const p of datos.partidas) {
    for (const g of p.pagos) {
      if (g.dueDate === null) continue
      const titulo = `${g.label ? `${g.label[0]!.toUpperCase()}${g.label.slice(1)} · ` : 'Pago · '}${p.concept}`
      entradas.push({ id: g.id, clase: 'pago', dia: g.dueDate, hora: null, minutos: null, titulo, detalle: bs(g.amountCents), hecha: g.paidAt !== null, ruta: '/planner/presupuesto' })
    }
  }
  for (const m of datos.momentos) {
    // Como en el cronograma: lo de antes de las 06:00 es la madrugada de esa noche, del día siguiente.
    const dia = m.startsAt < '06:00' ? sumarDias(evento.eventDate, 1) : evento.eventDate
    entradas.push({ id: m.id, clase: 'momento', dia, hora: m.startsAt, minutos: m.durationMin, titulo: m.title, detalle: m.place, hecha: false, ruta: '/planner/cronograma' })
  }
  for (const e of datos.ensayos) {
    const local = aBolivia(e.date)
    entradas.push({ id: e.id, clase: 'ensayo', dia: local.slice(0, 10), hora: local.slice(11, 16), minutos: 60, titulo: 'Ensayo del cortejo', detalle: e.place, hecha: false, ruta: '/planner/cortejo' })
  }
  for (const c of datos.citas) {
    entradas.push({ id: c.id, clase: 'cita', dia: c.startsAt.slice(0, 10), hora: c.startsAt.slice(11, 16), minutos: c.durationMin, titulo: c.title, detalle: c.place, hecha: false, ruta: `/planner/agenda?cita=${c.id}` })
  }
  return entradas.sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '').localeCompare(b.hora ?? ''))
}

/** Lo que viene: de hoy a `dias` más, sin lo ya hecho. */
export const proximasDeLaAgenda = (entradas: readonly EntradaDeAgenda[], hoy: string, dias = 14) => {
  const hasta = sumarDias(hoy, dias)
  return entradas.filter((e) => !e.hecha && e.dia >= hoy && e.dia <= hasta)
}

/**
 * Las semanas de un mes (`YYYY-MM`), de lunes a domingo, con los días de fuera del mes en `null`. Para la
 * vista de mes: cada casilla busca sus entradas por el día.
 */
export function semanasDelMes(mes: string): (string | null)[][] {
  const primero = `${mes}-01`
  const [a, m] = mes.split('-').map(Number) as [number, number]
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const hueco = (new Date(`${primero}T00:00:00Z`).getUTCDay() + 6) % 7
  const casillas: (string | null)[] = [...Array<null>(hueco).fill(null), ...Array.from({ length: dias }, (_, i) => sumarDias(primero, i))]
  while (casillas.length % 7 !== 0) casillas.push(null)
  return Array.from({ length: casillas.length / 7 }, (_, i) => casillas.slice(i * 7, i * 7 + 7))
}

/** Lee una cita del formulario. La hora va de cuarto en cuarto como `CampoHora`, pero se acepta cualquier minuto. */
export function leerCita(input: { title: string; dia: string; hora: string; durationMin: string; place: string; vendorId: string; notes: string }):
  | { ok: true; valor: Omit<Cita, 'id'> }
  | { ok: false; mensaje: string } {
  const title = input.title.trim()
  if (title.length === 0 || title.length > 200) return { ok: false, mensaje: 'La cita necesita un nombre de hasta 200 caracteres.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dia) || Number.isNaN(Date.parse(`${input.dia}T00:00:00Z`))) return { ok: false, mensaje: 'Elige el día.' }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora)) return { ok: false, mensaje: 'Elige la hora.' }
  const minutos = input.durationMin.trim() === '' ? 60 : Number(input.durationMin)
  if (!Number.isInteger(minutos) || minutos < 5 || minutos > 1440) return { ok: false, mensaje: 'La duración va de 5 minutos a 24 horas.' }
  const place = input.place.trim().slice(0, 200) || null
  const notes = input.notes.trim().slice(0, 2000) || null
  return { ok: true, valor: { title, startsAt: `${input.dia}T${input.hora}`, durationMin: minutos, place, vendorId: input.vendorId.trim() || null, notes } }
}

/** Días de `desde` a `hasta` (`YYYY-MM-DD`); negativo si ya pasó. */
export const diasHasta = (desde: string, hasta: string): number => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000)

/**
 * **Lo atrasado** (9 oct): tareas y pagos de antes de hoy sin hacer, lo más viejo primero. Es lo único que
 * se puede atrasar: una cita o un ensayo que pasó ya pasó. Antes no salía en ninguna parte de la agenda.
 */
export const atrasadasDeLaAgenda = (entradas: readonly EntradaDeAgenda[], hoy: string): EntradaDeAgenda[] =>
  entradas.filter((e) => !e.hecha && e.dia < hoy && (e.clase === 'tarea' || e.clase === 'pago')).sort((a, b) => a.dia.localeCompare(b.dia))

export type AvisoDeAgenda = { readonly cuando: string; readonly que: string; readonly ruta: string }

/** Con su hora, y un pago con su importe: el aviso no se repite por título, y dos cuotas iguales son dos avisos. */
const conHora = (e: EntradaDeAgenda) => {
  const titulo = e.clase === 'pago' && e.detalle ? `${e.titulo} (${e.detalle})` : e.titulo
  return e.hora === null ? titulo : `${e.hora} ${titulo}`
}
/** Lo que se avisa la víspera, una por cosa. El cronograma no: es la noche del evento, que ya se avisa. */
const SE_AVISA: readonly ClaseDeAgenda[] = ['tarea', 'pago', 'cita', 'ensayo', 'confirmacion']

/**
 * **Los avisos del día** (9 oct), del mantenimiento de cada mañana. Antes solo salían tareas y pagos de
 * mañana: las citas, los ensayos y el cierre de confirmaciones no avisaban nunca.
 * - **Hoy**: un solo resumen (tres y «y N más»), no una notificación por cosa.
 * - **Mañana**: una por cosa, con su hora.
 * - **Atrasado**: lo que venció ayer, una vez (pasado mañana ya no insiste: queda en la agenda).
 * - **El evento**: a 30 y 7 días, la víspera y el día.
 */
export function avisosDeLaAgenda(entradas: readonly EntradaDeAgenda[], hoy: string): AvisoDeAgenda[] {
  const manana = sumarDias(hoy, 1)
  const avisos: AvisoDeAgenda[] = []
  const evento = entradas.find((e) => e.clase === 'evento')
  if (evento) {
    const faltan = diasHasta(hoy, evento.dia)
    if (faltan === 0) avisos.push({ cuando: 'hoy', que: 'es tu evento', ruta: evento.ruta })
    else if (faltan === 1) avisos.push({ cuando: 'mañana', que: 'es tu evento', ruta: evento.ruta })
    else if (faltan === 7 || faltan === 30) avisos.push({ cuando: `en ${faltan} días`, que: 'tu evento', ruta: evento.ruta })
  }
  const deHoy = entradas.filter((e) => e.dia === hoy && !e.hecha && SE_AVISA.includes(e.clase))
  if (deHoy.length > 0) {
    const primeras = deHoy.slice(0, 3).map(conHora).join(' · ')
    avisos.push({ cuando: 'hoy', que: deHoy.length > 3 ? `${primeras} y ${deHoy.length - 3} más` : primeras, ruta: '/planner/agenda' })
  }
  for (const e of entradas) if (e.dia === manana && !e.hecha && SE_AVISA.includes(e.clase)) avisos.push({ cuando: 'mañana', que: conHora(e), ruta: e.ruta })
  for (const e of atrasadasDeLaAgenda(entradas, hoy)) if (e.dia === sumarDias(hoy, -1)) avisos.push({ cuando: 'atrasado', que: conHora(e), ruta: e.ruta })
  return avisos
}
