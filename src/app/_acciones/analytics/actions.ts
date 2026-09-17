'use server'

import { headers } from 'next/headers'
import { analytics, guests } from '@/app/composition/container'
import { classifyDevice, classifySource } from '@/modules/analytics/domain/view'
import { isErr } from '@/shared/result'

/**
 * Registra una visita a una invitación.
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
export async function recordInvitationViewAction(input: {
  token: string
  kind: 'guest'
  /** El `utm_source` de la URL que abrió el invitado. Lo lee el navegador, no el servidor. */
  utmSource?: string | null
  /** El referente real de la navegación, ya filtrado si era del propio sitio. */
  referrer?: string | null
}): Promise<void> {
  try {
    const cabeceras = await headers()
    // El dispositivo sí sale de la cabecera: el agente de usuario del POST es el mismo
    // navegador. La fuente no, porque el `Referer` de una Server Action es la propia
    // página de la invitación.
    const device = classifyDevice(cabeceras.get('user-agent') ?? '')
    const source = classifySource(input.utmSource ?? null, input.referrer ?? null)

    const group = await guests.resolveByToken(input.token)
    if (isErr(group)) return

    await analytics.record({
      eventId: group.value.eventId,
      guestGroupId: group.value.id,
      device,
      source,
      viewedAt: new Date(),
    })
  } catch (cause) {
    console.error('no se pudo registrar la visita', cause)
  }
}
