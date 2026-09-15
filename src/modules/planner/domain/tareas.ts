import type { Fiesta } from '@/modules/events'

/** Quién se encarga. «Mías» se resuelve con esto: el anfitrión ve las suyas, el planner las suyas. */
export type Responsable = 'anfitrion' | 'planner' | 'familia'
export const RESPONSABLES: readonly Responsable[] = ['anfitrion', 'planner', 'familia']

export type Tarea = {
  readonly id: string
  /** La clave de la etapa de su plantilla (`m12`, `semana`…). */
  readonly stage: string
  readonly title: string
  /** Día del calendario, `YYYY-MM-DD`. `null`: sin fecha. */
  readonly dueDate: string | null
  readonly assignee: Responsable
  readonly notes: string | null
  readonly doneAt: Date | null
  /** Correo de quien la cerró, copiado como texto: sobrevive a quitar a esa persona. */
  readonly doneBy: string | null
  readonly sortOrder: number
}

export type NuevaTarea = Omit<Tarea, 'id' | 'notes' | 'doneAt' | 'doneBy'>

export type Etapa = {
  readonly clave: string
  readonly nombre: string
  /** Cuánto antes del evento vence lo de esta etapa. */
  readonly antes: { readonly meses: number } | { readonly dias: number }
  readonly tareas: ReadonlyArray<{ readonly title: string; readonly assignee: Responsable }>
}

const a = (title: string, assignee: Responsable = 'anfitrion') => ({ title, assignee })

/**
 * Las plantillas, una por fiesta. Salen del «Plan maestro»: la boda se organiza en doce
 * meses; unos XV, en dieciocho, porque el vestido a medida y los ensayos del vals piden más.
 */
const PLANTILLAS: Record<Fiesta, readonly Etapa[]> = {
  boda: [
    {
      clave: 'm12',
      nombre: '12 meses antes',
      antes: { meses: 12 },
      tareas: [a('Definir el presupuesto y quién aporta'), a('Fijar la fecha'), a('Reservar el salón'), a('Reservar la iglesia o el registro civil')],
    },
    {
      clave: 'm9',
      nombre: '9 meses antes',
      antes: { meses: 9 },
      tareas: [a('Contratar fotógrafo y video', 'planner'), a('Contratar catering', 'planner'), a('Contratar música', 'planner'), a('Elegir vestido y traje')],
    },
    {
      clave: 'm6',
      nombre: '6 meses antes',
      antes: { meses: 6 },
      tareas: [a('Elegir a los padrinos y lo que apadrinan'), a('Terminar la invitación'), a('Armar la mesa de regalos')],
    },
    {
      clave: 'm3',
      nombre: '3 meses antes',
      antes: { meses: 3 },
      tareas: [a('Repartir las invitaciones'), a('Cerrar el menú', 'planner'), a('Primera prueba del vestido')],
    },
    {
      clave: 'm1',
      nombre: '1 mes antes',
      antes: { meses: 1 },
      tareas: [a('Llamar a quien no confirmó'), a('Distribuir las mesas'), a('Cronograma del día con los proveedores', 'planner')],
    },
    {
      clave: 'semana',
      nombre: 'La semana del evento',
      antes: { dias: 7 },
      tareas: [a('Pagos finales a proveedores', 'planner'), a('Ensayo de la ceremonia'), a('Sumar a los porteros y mandarles su acceso')],
    },
  ],
  xv: [
    {
      clave: 'm18',
      nombre: '18 meses antes',
      antes: { meses: 18 },
      tareas: [a('Definir el presupuesto y quién aporta'), a('Fijar la fecha'), a('Reservar el salón')],
    },
    {
      clave: 'm12',
      nombre: '12 meses antes',
      antes: { meses: 12 },
      tareas: [a('Encargar el vestido (a medida pide de 4 a 6 meses)'), a('Contratar DJ', 'planner'), a('Contratar fotógrafo y video', 'planner')],
    },
    {
      clave: 'm9',
      nombre: '9 meses antes',
      antes: { meses: 9 },
      tareas: [a('Elegir a los chambelanes y la corte de honor'), a('Contratar coreógrafo', 'planner')],
    },
    {
      clave: 'm6',
      nombre: '6 meses antes',
      antes: { meses: 6 },
      tareas: [a('Empezar los ensayos del vals'), a('Preparar el vals sorpresa'), a('Terminar la invitación')],
    },
    {
      clave: 'm2',
      nombre: '2 meses antes',
      antes: { meses: 2 },
      tareas: [a('Trajes de los chambelanes'), a('Encargar la torta', 'familia'), a('Decoración y show', 'planner'), a('Repartir las invitaciones')],
    },
    {
      clave: 'semana',
      nombre: 'La semana de los XV',
      antes: { dias: 7 },
      tareas: [a('Ensayo final del vals'), a('Horarios con los proveedores', 'planner'), a('Sumar a los porteros y mandarles su acceso')],
    },
  ],
}

export const etapasDe = (fiesta: Fiesta): readonly Etapa[] => PLANTILLAS[fiesta]

const iso = (d: Date): string => d.toISOString().slice(0, 10)
const utc = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`)

/**
 * Resta meses a un día del calendario, en UTC. `new Date('2027-05-15')` con la zona de
 * Bolivia devuelve el día anterior; aquí no hay zona. Un día que no existe en el mes de
 * destino cae al último de ese mes.
 */
export function restarMeses(fecha: string, meses: number): string {
  const d = utc(fecha)
  const destino = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - meses, 1))
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate()
  destino.setUTCDate(Math.min(d.getUTCDate(), ultimo))
  return iso(destino)
}

export const sumarDias = (fecha: string, dias: number): string => iso(new Date(utc(fecha).getTime() + dias * 86_400_000))

/**
 * Las tareas de la plantilla con sus fechas. Una fecha que ya pasó se queda: la tarea sale
 * atrasada, que es verdad, en vez de desaparecer como si no hiciera falta.
 */
export function sembrarTareas(fiesta: Fiesta, eventDate: string): NuevaTarea[] {
  let orden = 0
  return PLANTILLAS[fiesta].flatMap((etapa) => {
    const dueDate = 'meses' in etapa.antes ? restarMeses(eventDate, etapa.antes.meses) : sumarDias(eventDate, -etapa.antes.dias)
    return etapa.tareas.map((t) => ({ stage: etapa.clave, title: t.title, dueDate, assignee: t.assignee, sortOrder: orden++ }))
  })
}

export type EstadoDeTarea = 'hecha' | 'atrasada' | 'semana' | 'pendiente'

/** `hoy` es el día de Bolivia, como argumento: la regla no llama al reloj. */
export function estadoDeTarea(t: Pick<Tarea, 'dueDate' | 'doneAt'>, hoy: string): EstadoDeTarea {
  if (t.doneAt !== null) return 'hecha'
  if (t.dueDate === null) return 'pendiente'
  if (t.dueDate < hoy) return 'atrasada'
  return t.dueDate <= sumarDias(hoy, 7) ? 'semana' : 'pendiente'
}

export type FiltroDeTareas = 'todas' | 'mias' | 'atrasadas' | 'semana'
export const FILTROS_DE_TAREAS: readonly FiltroDeTareas[] = ['todas', 'mias', 'atrasadas', 'semana']

export function filtrarTareas(tareas: readonly Tarea[], filtro: FiltroDeTareas, ctx: { hoy: string; mias: Responsable }): Tarea[] {
  switch (filtro) {
    case 'mias':
      return tareas.filter((t) => t.assignee === ctx.mias)
    case 'atrasadas':
      return tareas.filter((t) => estadoDeTarea(t, ctx.hoy) === 'atrasada')
    case 'semana':
      return tareas.filter((t) => estadoDeTarea(t, ctx.hoy) === 'semana')
    default:
      return [...tareas]
  }
}

/** Qué parte está hecha, en porcentaje entero. Sin tareas no hay avance que presumir. */
export const avanceDeTareas = (tareas: readonly Pick<Tarea, 'doneAt'>[]): number =>
  tareas.length === 0 ? 0 : Math.round((tareas.filter((t) => t.doneAt !== null).length / tareas.length) * 100)
