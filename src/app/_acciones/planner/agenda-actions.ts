'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { planner } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { env } from '@/shared/config/env'
import { campo } from '@/shared/forms/campo'

export type AgendaActionState =
  | { status: 'idle' }
  | { status: 'success'; enlace?: string }
  | { status: 'error'; message: string; valores?: Record<string, string> }

// ============================================================================
// La agenda es del anfitrión y su planner (sección `planner`), como el cronograma y el presupuesto. Todas
// empiezan por `requireSession()` y su guardia.
// ============================================================================

const valoresDe = (fd: FormData): Record<string, string> =>
  Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string') as [string, string][])

export async function saveCitaAction(_previo: AgendaActionState, fd: FormData): Promise<AgendaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const id = campo(fd, 'citaId')
  const resultado = await planner.dia.saveCita(eventId, id === '' ? null : id, {
    title: campo(fd, 'title'),
    dia: campo(fd, 'dia'),
    hora: campo(fd, 'hora'),
    durationMin: campo(fd, 'durationMin'),
    place: campo(fd, 'place'),
    vendorId: campo(fd, 'vendorId'),
    notes: campo(fd, 'notes'),
  })
  if (!resultado.ok) return { status: 'error', message: resultado.mensaje, valores: valoresDe(fd) }
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  return { status: 'success' }
}

export async function removeCitaAction(_previo: AgendaActionState, fd: FormData): Promise<AgendaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const resultado = await planner.dia.removeCita(eventId, campo(fd, 'citaId'))
  if (!resultado.ok) return { status: 'error', message: resultado.mensaje }
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  return { status: 'success' }
}

/**
 * El enlace privado para suscribirse desde el calendario del teléfono. Se enseña una vez: de él solo queda
 * el hash, y pedir otro deja de actualizar el anterior.
 */
export async function emitirSuscripcionAction(_previo: AgendaActionState, fd: FormData): Promise<AgendaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  // En modo soporte la suscripción sería del admin mirando como el cliente: no se emite.
  if (actor.soporte) return { status: 'error', message: 'La suscripción la pide cada persona desde su propia cuenta.' }
  const token = await planner.dia.emitirSuscripcion(eventId, actor.userId)
  return { status: 'success', enlace: `${env.SITE_URL.replace(/\/$/, '')}/calendario/${token}` }
}

/**
 * «Hecha» o «Pagado» desde la agenda, y su «Deshacer» (9 oct): `hecha` dice el estado, no lo alterna, para
 * que deshacer dos veces no vuelva a cerrarla. Tareas y pagos; lo demás no se marca.
 */
export async function marcarEnLaAgendaAction(_previo: AgendaActionState, fd: FormData): Promise<AgendaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const id = campo(fd, 'id')
  const hecha = campo(fd, 'hecha') === 'true'
  const clase = campo(fd, 'clase')
  const resultado =
    clase === 'tarea' ? await planner.marcarTarea(eventId, id, hecha, actor.email) : clase === 'pago' ? await planner.setPaymentPaid(eventId, id, hecha) : { ok: false as const, mensaje: 'Esto no se marca desde la agenda.' }
  if (!resultado.ok) return { status: 'error', message: resultado.mensaje }
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  // Navega la acción, no el botón: la fila marcada sale de «Atrasado» y su botón se desmonta antes de poder
  // navegar. Solo dentro de la agenda de este evento: `despues` llega del navegador.
  const despues = campo(fd, 'despues')
  if (despues.startsWith(`/panel/eventos/${eventSlug}/planner/agenda?`)) redirect(despues)
  return { status: 'success' }
}

/** Otro día para una tarea o un pago atrasado, desde la agenda (9 oct). */
export async function reprogramarEnLaAgendaAction(_previo: AgendaActionState, fd: FormData): Promise<AgendaActionState> {
  const actor = await requireSession()
  const eventId = campo(fd, 'eventId')
  const eventSlug = campo(fd, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'planner' })
  const id = campo(fd, 'id')
  const dia = campo(fd, 'dia')
  const clase = campo(fd, 'clase')
  const resultado =
    clase === 'tarea' ? await planner.reprogramarTarea(eventId, id, dia) : clase === 'pago' ? await planner.reprogramarPago(eventId, id, dia) : { ok: false as const, mensaje: 'Esto se cambia en su pantalla.' }
  if (!resultado.ok) return { status: 'error', message: resultado.mensaje, valores: valoresDe(fd) }
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  return { status: 'success' }
}
