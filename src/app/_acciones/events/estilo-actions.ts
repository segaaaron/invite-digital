'use server'

import { revalidatePath } from 'next/cache'
import { admin, events, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { leerEstilo } from '@/modules/events/domain/estilo'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { isAdmin } from '@/modules/identity'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'

export type EstiloState = { status: 'idle' | 'success' | 'error'; message: string }

/**
 * El color de acento y la letra del evento (Gala o más, `0088`). Lo escribe quien escribe la
 * invitación (sección `invitacion`); el plan lo corta aquí, no en la pantalla. Solo se guarda lo
 * que el diseño admite y lo que se lee sobre su fondo.
 */
export async function guardarEstiloAction(_previo: EstiloState, formData: FormData): Promise<EstiloState> {
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'invitacion' })
  if (!isAdmin(actor) && isErr(await plans.requireFeature(eventId, 'estilo'))) {
    return { status: 'error', message: 'Tu plan no incluye elegir los colores y la letra.' }
  }

  const evento = await events.getByIdUnscoped(eventId)
  if (isErr(evento)) return { status: 'error', message: 'No se pudo leer el evento. Vuelve a intentarlo.' }
  const admite = themeFor(evento.value.themeKey).estilo
  const estilo = leerEstilo(
    { acento: campo(formData, 'acento'), caligrafia: campo(formData, 'caligrafia'), titulares: campo(formData, 'titulares') },
    { acento: admite?.acento ?? null, caligrafia: admite?.caligrafia !== undefined, titulares: admite?.titulares !== undefined },
  )
  if (estilo === null) return { status: 'error', message: 'Elige un color y una letra de las que ofrece tu diseño.' }

  await events.estilo.guardar(eventId, estilo)
  if (isAdmin(actor)) await admin.record(actor, { action: 'evento.invitacion', subject: eventSlug, detail: 'estilo' })
  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success', message: 'Estilo guardado. Mira cómo queda a la derecha.' }
}
