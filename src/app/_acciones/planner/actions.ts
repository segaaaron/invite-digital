'use server'

import { revalidatePath } from 'next/cache'
import { events, planner } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { parseAmount } from '@/shared/money'
import { isErr } from '@/shared/result'
import type { PlannerResult } from '@/modules/planner/application/planner-use-cases'
import { campo } from '@/shared/forms/campo'

/**
 * `valores` vuelve con el error: React vacía el formulario al terminar la acción, también
 * cuando falla, y quien escribió una partida entera la perdería por un importe mal puesto.
 */
export type PlannerActionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string; valores?: Record<string, string> }

// ============================================================================
// Todas son del panel y empiezan por `requireSession()`. Las tareas son de todo el equipo
// —sección `cliente`, como invitados y mensajes—; el presupuesto, del anfitrión y su planner
// —sección `planner`—. La portería no entra.
// ============================================================================


/**
 * La fiesta y la fecha del evento. Se llama **después** de la guardia de cada acción, que va
 * escrita en su cuerpo para que `verify:tenancy` la vea.
 */
async function eventoDe(actor: Awaited<ReturnType<typeof requireSession>>, fd: FormData) {
  const evento = await events.getByIdFor(actor, campo(fd, 'eventId'), { section: 'cliente' })
  if (isErr(evento)) throw new Error(evento.error.detail)
  return { eventId: evento.value.id, eventSlug: campo(fd, 'eventSlug'), fiesta: fiestaDeTema(evento.value.themeKey), eventDate: evento.value.eventDate }
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
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta, eventDate } = await eventoDe(actor, fd)
  await planner.seedTasks(eventId, fiesta, eventDate)
  return responder({ ok: true }, eventSlug)
}

export async function addTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta } = await eventoDe(actor, fd)
  const resultado = await planner.addTask(eventId, fiesta, {
    title: campo(fd, 'title'),
    stage: campo(fd, 'stage'),
    dueDate: campo(fd, 'dueDate'),
    assignee: campo(fd, 'assignee'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function editTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'cliente' })
  const { eventId, eventSlug, fiesta } = await eventoDe(actor, fd)
  const resultado = await planner.editTask(eventId, fiesta, campo(fd, 'taskId'), {
    title: campo(fd, 'title'),
    stage: campo(fd, 'stage'),
    dueDate: campo(fd, 'dueDate'),
    assignee: campo(fd, 'assignee'),
    notes: campo(fd, 'notes'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function toggleTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'cliente' })
  return responder(await planner.toggleTask(campo(fd, 'eventId'), campo(fd, 'taskId'), actor.email), campo(fd, 'eventSlug'))
}

export async function moveTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'cliente' })
  const dir = campo(fd, 'dir') === 'abajo' ? 'abajo' : 'arriba'
  return responder(await planner.moveTask(campo(fd, 'eventId'), campo(fd, 'taskId'), dir), campo(fd, 'eventSlug'))
}

export async function removeTaskAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'cliente' })
  return responder(await planner.removeTask(campo(fd, 'eventId'), campo(fd, 'taskId')), campo(fd, 'eventSlug'))
}

// ─── Presupuesto ─────────────────────────────────────────────────────────────
// El dinero lo llevan el anfitrión y su planner (sección `planner`). El co-anfitrión lo ve
// en la pantalla, pero no escribe ni marca pagos.

export async function saveItemAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'planner' })
  const { eventId, eventSlug, fiesta } = await eventoDe(actor, fd)

  const previsto = centavos(campo(fd, 'estimated'), false)
  if (!previsto.ok) return { status: 'error', message: previsto.message, valores: valoresDe(fd) }
  const contratado = centavos(campo(fd, 'contracted'), true)
  if (!contratado.ok) return { status: 'error', message: contratado.message, valores: valoresDe(fd) }

  const itemId = campo(fd, 'itemId')
  const resultado = await planner.saveItem(eventId, fiesta, itemId === '' ? null : itemId, {
    category: campo(fd, 'category'),
    concept: campo(fd, 'concept'),
    estimatedCents: previsto.cents ?? 0,
    contractedCents: contratado.cents,
    payer: campo(fd, 'payer'),
    padrinoLabel: campo(fd, 'padrinoLabel'),
    notes: campo(fd, 'notes'),
  })
  return responder(resultado, eventSlug, fd)
}

export async function removeItemAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'planner' })
  return responder(await planner.removeItem(campo(fd, 'eventId'), campo(fd, 'itemId')), campo(fd, 'eventSlug'))
}

export async function addPaymentAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'planner' })
  const importe = centavos(campo(fd, 'amount'), false)
  if (!importe.ok) return { status: 'error', message: importe.message, valores: valoresDe(fd) }
  const resultado = await planner.addPayment(campo(fd, 'eventId'), campo(fd, 'itemId'), { amountCents: importe.cents ?? 0, dueDate: campo(fd, 'dueDate'), label: campo(fd, 'label') })
  return responder(resultado, campo(fd, 'eventSlug'), fd)
}

export async function setPaymentPaidAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'planner' })
  const resultado = await planner.setPaymentPaid(campo(fd, 'eventId'), campo(fd, 'paymentId'), campo(fd, 'paid') === 'true')
  return responder(resultado, campo(fd, 'eventSlug'))
}

export async function removePaymentAction(_previo: PlannerActionState, fd: FormData): Promise<PlannerActionState> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: campo(fd, 'eventId'), eventSlug: campo(fd, 'eventSlug'), section: 'planner' })
  return responder(await planner.removePayment(campo(fd, 'eventId'), campo(fd, 'paymentId')), campo(fd, 'eventSlug'))
}
