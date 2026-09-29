'use server'

import { revalidatePath } from 'next/cache'
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
