'use server'

import { revalidatePath } from 'next/cache'
import { events, planner } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import { parseAmount } from '@/modules/registry'
import { isErr } from '@/shared/result'
import type { PlannerResult } from './application/planner-use-cases'

/**
 * `valores` vuelve con el error: React vacía el formulario al terminar la acción, también
 * cuando falla, y quien escribió una partida entera la perdería por un importe mal puesto.
 */
export type PlannerActionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string; valores?: Record<string, string> }

// ============================================================================
// Todas son del panel y empiezan por `requireSession()`. El planner es de quien celebra y
// de quien lleva el evento: sección `cliente`, como invitados y mensajes. La portería no
// entra.
// ============================================================================

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? '')

/**
 * La fiesta y la fecha del evento. Se llama **después** de la guardia de cada acción, que va
 * escrita en su cuerpo para que `verify:tenancy` la vea.
 */
async function eventoDe(actor: Awaited<ReturnType<typeof requireSession>>, fd: FormData) {
  const evento = await events.getByIdFor(actor, texto(fd, 'eventId'), { section: 'cliente' })
  if (isErr(evento)) throw new Error(evento.error.detail)
  return { eventId: evento.value.id, eventSlug: texto(fd, 'eventSlug'), fiesta: fiestaDeTema(evento.value.themeKey), eventDate: evento.value.eventDate }
}

const valoresDe = (fd: FormData): Record<string, string> =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string') as [string, string][])

function responder(resultado: PlannerResult, eventSlug: string, fd?: FormData): PlannerActionState {
  if (!resultado.ok) return { status: 'error', message: resultado.mensaje, ...(fd ? { valores: valoresDe(fd) } : {}) }
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  return { status: 'success' }
}

/** Importe opcional: vacío es `null`; lo que no es un importe, error. */
function centavos(valor: string, opcional: boolean): { ok: true; cents: number | null } | { ok: false; message: string } {
  if (valor.trim() === '') return opcional ? { ok: true, cents: null } : { ok: true, cents: 0 }
  const leido = parseAmount(valor)
  return isErr(leido) ? { ok: false, message: leido.error.detail } : { ok: true, cents: leido.value }
}

// ─── Tareas ──────────────────────────────────────────────────────────────────

export async function seedTasksAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta, eventDate } = await eventoDe(actor, fd)
  await planner.seedTasks(eventId, fiesta, eventDate)
  return responder({ ok: true }, eventSlug)
}

export async function addTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta } = await eventoDe(actor, fd)
  const resultado = await planner.addTask(eventId, fiesta, {
    title: texto(fd, 'title'),
    stage: texto(fd, 'stage'),
    dueDate: texto(fd, 'dueDate'),
    assignee: texto(fd, 'assignee'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function editTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta } = await eventoDe(actor, fd)
  const resultado = await planner.editTask(eventId, fiesta, texto(fd, 'taskId'), {
    title: texto(fd, 'title'),
    stage: texto(fd, 'stage'),
    dueDate: texto(fd, 'dueDate'),
    assignee: texto(fd, 'assignee'),
    notes: texto(fd, 'notes'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function toggleTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  return responder(await planner.toggleTask(texto(fd, 'eventId'), texto(fd, 'taskId'), actor.email), texto(fd, 'eventSlug'))
}

export async function moveTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const dir = texto(fd, 'dir') === 'abajo' ? 'abajo' : 'arriba'
  return responder(await planner.moveTask(texto(fd, 'eventId'), texto(fd, 'taskId'), dir), texto(fd, 'eventSlug'))
}

export async function removeTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  return responder(await planner.removeTask(texto(fd, 'eventId'), texto(fd, 'taskId')), texto(fd, 'eventSlug'))
}

// ─── Presupuesto ─────────────────────────────────────────────────────────────

export async function saveItemAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta } = await eventoDe(actor, fd)

  const previsto = centavos(texto(fd, 'estimated'), false)
  if (!previsto.ok) return { status: 'error', message: previsto.message, valores: valoresDe(fd) }
  const contratado = centavos(texto(fd, 'contracted'), true)
  if (!contratado.ok) return { status: 'error', message: contratado.message, valores: valoresDe(fd) }

  const itemId = texto(fd, 'itemId')
  const resultado = await planner.saveItem(eventId, fiesta, itemId === '' ? null : itemId, {
    category: texto(fd, 'category'),
    concept: texto(fd, 'concept'),
    estimatedCents: previsto.cents ?? 0,
    contractedCents: contratado.cents,
    payer: texto(fd, 'payer'),
    padrinoLabel: texto(fd, 'padrinoLabel'),
    notes: texto(fd, 'notes'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function removeItemAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  return responder(await planner.removeItem(texto(fd, 'eventId'), texto(fd, 'itemId')), texto(fd, 'eventSlug'))
}

export async function addPaymentAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const importe = centavos(texto(fd, 'amount'), false)
  if (!importe.ok) return { status: 'error', message: importe.message, valores: valoresDe(fd) }
  const resultado = await planner.addPayment(texto(fd, 'eventId'), texto(fd, 'itemId'), { amountCents: importe.cents ?? 0, dueDate: texto(fd, 'dueDate'), label: texto(fd, 'label') })
  return responder(resultado, texto(fd, 'eventSlug'), fd)
}

export async function setPaymentPaidAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  const resultado = await planner.setPaymentPaid(texto(fd, 'eventId'), texto(fd, 'paymentId'), texto(fd, 'paid') === 'true')
  return responder(resultado, texto(fd, 'eventSlug'))
}

export async function removePaymentAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: texto(fd, 'eventId'), eventSlug: texto(fd, 'eventSlug'), section: 'cliente' })
  return responder(await planner.removePayment(texto(fd, 'eventId'), texto(fd, 'paymentId')), texto(fd, 'eventSlug'))
}
