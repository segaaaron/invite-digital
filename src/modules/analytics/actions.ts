'use server'

import { headers } from 'next/headers'
import { analytics, events, guests } from '@/app/composition/container'
import { classifyDevice, classifySource } from './domain/view'
import { isErr } from '@/shared/result'

/**
 * Registra una visita a una invitación o a la vista del cliente.
 *
 * **Sin sesión, a propósito**: el invitado no tiene cuenta. Se autoriza por token, igual
 * que el RSVP y la mesa de regalos; un token desconocido no escribe nada.
 *
 * **Este es el único fallo silencioso del proyecto, y está razonado en el spec.** Quien
 * está al otro lado mira una invitación, no un panel: enseñarle un error porque una
 * estadística no se guardó sería peor que perder la estadística. El detalle va al
 * registro del servidor.
 *
 * No devuelve nada que permita distinguir un token bueno de uno malo.
 */
export async function recordInvitationViewAction(input: { token: string; kind: 'guest' | 'client' }): Promise<void> {
  try {
    const cabeceras = await headers()
    const device = classifyDevice(cabeceras.get('user-agent') ?? '')
    const source = classifySource(cabeceras.get('x-utm-source'), cabeceras.get('referer'))

    if (input.kind === 'guest') {
      const group = await guests.resolveByToken(input.token)
      if (isErr(group)) return

      await analytics.record({
        eventId: group.value.eventId,
        guestGroupId: group.value.id,
        device,
        source,
        viewedAt: new Date(),
      })
      return
    }

    const share = await events.resolveShare(input.token)
    if (isErr(share)) return

    await analytics.record({
      eventId: share.value.id,
      guestGroupId: null,
      device,
      source,
      viewedAt: new Date(),
    })
  } catch (cause) {
    console.error('no se pudo registrar la visita', cause)
  }
}
