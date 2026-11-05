'use server'

import { revalidarRuta } from '@/shared/cache/revalidar-ruta'
import { plans, reminders } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { ReminderKind } from '@/modules/reminders/domain/due'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

export type ReminderActionState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

// ============================================================================
// Todas las acciones de los recordatorios son del atelier y empiezan por
// `await requireSession()`. Una Server Action es un extremo HTTP público: vivir detrás
// del panel no la protege de nadie.
//
// Aquí no hay ninguna acción del invitado, y no debería haberla: al invitado no se le
// pide nada desde esta pantalla, se le escribe por WhatsApp desde el navegador.
// ============================================================================

export async function markReminderSentAction(input: {
  eventId: string
  eventSlug: string
  guestGroupId: string
  kind: ReminderKind
}): Promise<ReminderActionState> {
  const t = await tr()
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug, section: 'cliente' })
  // La cola es del plan (`0101`): la pantalla ya no la enseña sin él, y esto lo cierra de verdad.
  // Una Server Action es un extremo HTTP público; esconder el botón no protege de nadie.
  const permitido = await plans.requireFeature(input.eventId, 'reminders')
  if (isErr(permitido)) {
    // **«Su plan no lo trae» y «la base no contestó» no son lo mismo.** `requireFeature` devuelve
    // también `storage_failure`, y leerlo todo como lo primero le decía al atelier una mentira
    // —con el botón muerto y sin una línea en el registro— cada vez que Postgres fallaba.
    if (permitido.error.kind !== 'feature_not_included') {
      registrarFallo('reminders/actions', 'no se pudo comprobar el plan del evento', permitido.error.kind, permitido.error.detail)
      return { status: 'error', message: t('No pudimos comprobar tu plan. Inténtalo en un momento.', 'We couldn’t check your plan. Try again in a moment.') }
    }
    // El detalle dice **a qué plan hay que subir al cliente**; sin él el atelier se queda sin salida.
    return { status: 'error', message: traducir(permitido.error.detail, t) }
  }

  const result = await reminders.markSent({
    eventId: input.eventId,
    guestGroupId: input.guestGroupId,
    kind: input.kind,
  })

  if (isErr(result)) {
    // El detalle —que lleva identificadores— al registro del servidor; a la pantalla, lo
    // que el atelier puede hacer al respecto. Un fallo mudo dejaría la fila en la cola y
    // al atelier creyendo que ya la había atendido.
    registrarFallo('reminders/actions', 'recordatorio no anotado', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'not_found'
          ? t('Ese grupo ya no está en este evento. Vuelve a cargar la página.', 'That group is no longer in this event. Reload the page.')
          : t('No pudimos anotar el recordatorio. Sigue pendiente; inténtalo en un momento.', 'We couldn’t log the reminder. It is still pending; try again in a moment.'),
    }
  }

  revalidarRuta(`/dashboard/events/${input.eventSlug}/guests`)
  return { status: 'success' }
}
