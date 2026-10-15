'use server'

import { revalidatePath } from 'next/cache'
import { rsvp } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { leerPreguntas } from '@/modules/rsvp/domain/preguntas'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export type PreguntasState = { status: 'idle' | 'success' | 'error'; message: string }

/** El anfitrión elige qué se pregunta al confirmar: canción, menús y actos (una opción por línea). */
export async function guardarPreguntasAction(_previo: PreguntasState, formData: FormData): Promise<PreguntasState> {
  const t = await tr()
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'cliente' })

  const preguntas = leerPreguntas({ cancion: formData.get('cancion') === 'on', menus: campo(formData, 'menus'), actos: campo(formData, 'actos') })
  if (isErr(preguntas)) return { status: 'error', message: traducir(preguntas.error.detail, t) }
  await rsvp.preguntas.guardar(eventId, preguntas.value)
  revalidatePath(`/panel/eventos/${eventSlug}`, 'layout')
  return { status: 'success', message: t('Guardado. Tus invitados lo ven al confirmar que vienen.', 'Saved. Your guests see it when they confirm they are coming.') }
}
