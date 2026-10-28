'use server'

import { revalidarRuta } from '@/shared/cache/revalidar-ruta'
import { admin, events, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { leerEstilo } from '@/modules/events/domain/estilo'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { isAdmin } from '@/modules/identity'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export type EstiloState = { status: 'idle' | 'success' | 'error'; message: string }

/**
 * El color de acento y la letra del evento (Gala o más, `0088`). Lo escribe quien escribe la
 * invitación (sección `invitacion`); el plan lo corta aquí, no en la pantalla. Solo se guarda lo
 * que el diseño admite y lo que se lee sobre su fondo.
 */
export async function guardarEstiloAction(_previo: EstiloState, formData: FormData): Promise<EstiloState> {
  const t = await tr()
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'invitacion' })
  if (!isAdmin(actor) && isErr(await plans.requireFeature(eventId, 'estilo'))) {
    return { status: 'error', message: t('Tu plan no incluye elegir los colores y la letra.', 'Your plan doesn’t include choosing colors and lettering.') }
  }

  const evento = await events.getByIdUnscoped(eventId)
  if (isErr(evento)) return { status: 'error', message: t('No se pudo leer el evento. Vuelve a intentarlo.', 'The event couldn’t be read. Try again.') }
  const admite = themeFor(evento.value.themeKey).estilo
  const estilo = leerEstilo(
    { acento: campo(formData, 'acento'), caligrafia: campo(formData, 'caligrafia'), titulares: campo(formData, 'titulares') },
    { acento: admite?.acento ?? null, caligrafia: admite?.caligrafia !== undefined, titulares: admite?.titulares !== undefined },
  )
  if (estilo === null) return { status: 'error', message: t('Elige un color y una letra de las que ofrece tu diseño.', 'Choose a color and a lettering your design offers.') }

  await events.estilo.guardar(eventId, estilo)
  if (isAdmin(actor)) await admin.record(actor, { action: 'evento.invitacion', subject: eventSlug, detail: 'estilo' })
  revalidarRuta(`/dashboard/events/${eventSlug}/setup`)
  return { status: 'success', message: t('Estilo guardado. Mira cómo queda a la derecha.', 'Style saved. See how it looks on the right.') }
}
