import type { Fiesta } from '@/modules/events'
import { categoriasDe, ETIQUETAS_DE_PAGO, PAGADORES, type Pagador } from '../domain/presupuesto'
import { etapasDe, RESPONSABLES, type Responsable, sembrarTareas } from '../domain/tareas'
import type { PlannerStore } from './ports'

type Deps = { store: PlannerStore; clock: () => Date }

/** El mensaje va listo para la pantalla: el panel es solo español. */
export type PlannerResult = { ok: true } | { ok: false; mensaje: string }

const fallo = (mensaje: string): PlannerResult => ({ ok: false, mensaje })
const NO_ESTA = 'Ya no está. Recarga la página.'

/** La clave de las tareas que no son de la plantilla. */
const ETAPA_PROPIA = 'propias'

/** `''` es sin fecha. Una fecha que el calendario no tiene —30 de febrero— no pasa. */
function leerFecha(valor: string): { ok: true; fecha: string | null } | { ok: false } {
  const limpio = valor.trim()
  if (limpio === '') return { ok: true, fecha: null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpio)) return { ok: false }
  return new Date(`${limpio}T00:00:00.000Z`).toISOString().slice(0, 10) === limpio ? { ok: true, fecha: limpio } : { ok: false }
}

type TareaInput = { title: string; stage: string; dueDate: string; assignee: string }

function leerTarea(fiesta: Fiesta, input: TareaInput) {
  const title = input.title.trim()
  if (title.length === 0 || title.length > 200) return { ok: false as const, mensaje: 'La tarea necesita un título de hasta 200 caracteres.' }
  if (input.stage !== ETAPA_PROPIA && !etapasDe(fiesta).some((e) => e.clave === input.stage)) return { ok: false as const, mensaje: 'Elige una etapa de la lista.' }
  if (!RESPONSABLES.includes(input.assignee as Responsable)) return { ok: false as const, mensaje: 'Elige quién se encarga.' }
  const fecha = leerFecha(input.dueDate)
  if (!fecha.ok) return { ok: false as const, mensaje: 'Revisa la fecha.' }
  return { ok: true as const, valor: { title, stage: input.stage, dueDate: fecha.fecha, assignee: input.assignee as Responsable } }
}

/** Bolivia es UTC−4 todo el año, sin horario de verano. */
const hoyEnBolivia = (instante: Date): string => new Date(instante.getTime() - 4 * 3_600_000).toISOString().slice(0, 10)

/** Siembra la plantilla de su fiesta. Si el evento ya tiene tareas, no hace nada. */
export const seedTasks =
  ({ store, clock }: Deps) =>
  async (eventId: string, fiesta: Fiesta, eventDate: string): Promise<{ ok: true; creadas: number }> => {
    if ((await store.listTasks(eventId)).length > 0) return { ok: true, creadas: 0 }
    const tareas = sembrarTareas(fiesta, eventDate, hoyEnBolivia(clock()))
    await store.insertTasks(eventId, tareas)
    return { ok: true, creadas: tareas.length }
  }

export const addTask =
  ({ store }: Deps) =>
  async (eventId: string, fiesta: Fiesta, input: TareaInput): Promise<PlannerResult> => {
    const leida = leerTarea(fiesta, input)
    if (!leida.ok) return fallo(leida.mensaje)
    const actuales = await store.listTasks(eventId)
    const sortOrder = actuales.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1
    await store.insertTasks(eventId, [{ ...leida.valor, sortOrder }])
    return { ok: true }
  }

export const editTask =
  ({ store }: Deps) =>
  async (eventId: string, fiesta: Fiesta, id: string, input: TareaInput & { notes: string }): Promise<PlannerResult> => {
    const leida = leerTarea(fiesta, input)
    if (!leida.ok) return fallo(leida.mensaje)
    const notes = input.notes.trim().slice(0, 2000) || null
    return (await store.updateTask(eventId, id, { ...leida.valor, notes })) ? { ok: true } : fallo(NO_ESTA)
  }

/** Hecha o no. Guarda cuándo y quién, para ver quién cerró cada cosa. */
export const toggleTask =
  ({ store, clock }: Deps) =>
  async (eventId: string, id: string, by: string): Promise<PlannerResult> => {
    const tarea = (await store.listTasks(eventId)).find((t) => t.id === id)
    if (!tarea) return fallo(NO_ESTA)
    const hecha = tarea.doneAt === null
    await store.updateTask(eventId, id, { doneAt: hecha ? clock() : null, doneBy: hecha ? by : null })
    return { ok: true }
  }

export const removeTask =
  ({ store }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await store.removeTask(eventId, id)) ? { ok: true } : fallo(NO_ESTA)

/** Sube o baja dentro de su etapa, cambiando el orden con la vecina. En el borde no hace nada. */
export const moveTask =
  ({ store }: Deps) =>
  async (eventId: string, id: string, dir: 'arriba' | 'abajo'): Promise<PlannerResult> => {
    const todas = await store.listTasks(eventId)
    const tarea = todas.find((t) => t.id === id)
    if (!tarea) return fallo(NO_ESTA)
    const etapa = todas.filter((t) => t.stage === tarea.stage)
    const i = etapa.findIndex((t) => t.id === id)
    const vecina = etapa[dir === 'arriba' ? i - 1 : i + 1]
    if (!vecina) return { ok: true }
    await store.updateTask(eventId, tarea.id, { sortOrder: vecina.sortOrder })
    await store.updateTask(eventId, vecina.id, { sortOrder: tarea.sortOrder })
    return { ok: true }
  }

type PartidaInput = {
  category: string
  concept: string
  estimatedCents: number
  contractedCents: number | null
  payer: string
  padrinoLabel: string
  notes: string
}

const centavosValidos = (n: number) => Number.isInteger(n) && n >= 0 && n <= 2_000_000_000

/** Crea (`id` nulo) o edita una partida. Los importes llegan ya en centavos: los parsea la acción. */
export const saveItem =
  ({ store }: Deps) =>
  async (eventId: string, fiesta: Fiesta, id: string | null, input: PartidaInput): Promise<PlannerResult> => {
    const concept = input.concept.trim()
    if (concept.length === 0 || concept.length > 160) return fallo('La partida necesita un concepto de hasta 160 caracteres.')
    if (!categoriasDe(fiesta).some((c) => c.clave === input.category)) return fallo('Elige una categoría de la lista.')
    if (!centavosValidos(input.estimatedCents) || (input.contractedCents !== null && !centavosValidos(input.contractedCents))) return fallo('Revisa los importes.')
    if (!PAGADORES.includes(input.payer as Pagador)) return fallo('Elige quién paga.')
    const payer = input.payer as Pagador
    const item = {
      category: input.category,
      concept,
      estimatedCents: input.estimatedCents,
      contractedCents: input.contractedCents,
      payer,
      padrinoLabel: payer === 'padrino' ? input.padrinoLabel.trim().slice(0, 120) || null : null,
      notes: input.notes.trim().slice(0, 2000) || null,
    }
    if (id === null) {
      await store.insertItem(eventId, item)
      return { ok: true }
    }
    return (await store.updateItem(eventId, id, item)) ? { ok: true } : fallo(NO_ESTA)
  }

export const removeItem =
  ({ store }: Deps) =>
  async (eventId: string, id: string): Promise<PlannerResult> =>
    (await store.removeItem(eventId, id)) ? { ok: true } : fallo(NO_ESTA)

export const addPayment =
  ({ store }: Deps) =>
  async (eventId: string, itemId: string, input: { amountCents: number; dueDate: string; label: string }): Promise<PlannerResult> => {
    if (!centavosValidos(input.amountCents) || input.amountCents === 0) return fallo('El pago necesita un importe mayor que cero.')
    const fecha = leerFecha(input.dueDate)
    if (!fecha.ok) return fallo('Revisa la fecha del pago.')
    if (input.label !== '' && !(ETIQUETAS_DE_PAGO as readonly string[]).includes(input.label)) return fallo('El pago es anticipo, cuota o saldo.')
    return (await store.insertPayment(eventId, itemId, { amountCents: input.amountCents, dueDate: fecha.fecha, label: input.label || null })) ? { ok: true } : fallo(NO_ESTA)
  }

export const setPaymentPaid =
  ({ store, clock }: Deps) =>
  async (eventId: string, paymentId: string, pagado: boolean): Promise<PlannerResult> =>
    (await store.setPaymentPaid(eventId, paymentId, pagado ? clock() : null)) ? { ok: true } : fallo(NO_ESTA)

export const removePayment =
  ({ store }: Deps) =>
  async (eventId: string, paymentId: string): Promise<PlannerResult> =>
    (await store.removePayment(eventId, paymentId)) ? { ok: true } : fallo(NO_ESTA)
