'use server'

import { revalidatePath } from 'next/cache'
import { events } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isAdmin } from '@/modules/identity'
import { env } from '@/shared/config/env'
import { campo } from '@/shared/forms/campo'
import { tr } from '@/shared/i18n/idioma-servidor'

export type SaveTheDateState = { status: 'idle' | 'success' | 'error'; message: string; url?: string }

const urlDe = (token: string) => `${env.SITE_URL.replace(/\/+$/, '')}/guarda/${token}`

/** Crea (o cambia) el enlace del «save the date». Se vende como extra; el admin lo da siempre. */
export async function crearSaveTheDateAction(_previo: SaveTheDateState, formData: FormData): Promise<SaveTheDateState> {
  const t = await tr()
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'invitacion' })
  if (!isAdmin(actor) && !(await events.saveTheDate.comprado(eventId))) {
    return { status: 'error', message: t('El save the date se pide como extra, desde Extras.', 'The save the date is requested as an extra, from Extras.') }
  }
  const token = await events.saveTheDate.crear(eventId)
  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success', message: t('Save the date listo. Si ya habías compartido uno, ese dejó de abrir.', 'Save the date ready. If you had shared one before, it stopped opening.'), url: urlDe(token) }
}

export async function quitarSaveTheDateAction(_previo: SaveTheDateState, formData: FormData): Promise<SaveTheDateState> {
  const t = await tr()
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'invitacion' })
  await events.saveTheDate.quitar(eventId)
  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success', message: t('Save the date quitado: el enlace ya no abre.', 'Save the date removed: the link no longer opens.') }
}
