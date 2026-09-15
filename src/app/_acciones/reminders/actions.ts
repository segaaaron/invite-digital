'use server'

import { revalidatePath } from 'next/cache'
import { reminders } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import type { ReminderKind } from '@/modules/reminders/domain/due'

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
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug })

  const result = await reminders.markSent({
    eventId: input.eventId,
    guestGroupId: input.guestGroupId,
    kind: input.kind,
  })

  if (isErr(result)) {
    // El detalle —que lleva identificadores— al registro del servidor; a la pantalla, lo
    // que el atelier puede hacer al respecto. Un fallo mudo dejaría la fila en la cola y
    // al atelier creyendo que ya la había atendido.
    console.error('recordatorio no anotado', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'not_found'
          ? 'Ese grupo ya no está en este evento. Vuelve a cargar la página.'
          : 'No pudimos anotar el recordatorio. Sigue pendiente; inténtalo en un momento.',
    }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/invitados`)
  return { status: 'success' }
}
