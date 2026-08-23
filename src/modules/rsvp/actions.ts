'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { guests, rsvp } from '@/app/composition/container'
import { eventUnlocked } from '@/modules/events/actions'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { isErr } from '@/shared/result'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { guardedRespond, type RsvpOutcome } from './application/guarded-respond'

export type RsvpActionState = RsvpOutcome | { status: 'idle' }

// Diez respuestas por minuto y por IP: un grupo grande cambiando de opinión cabe de
// sobra; la fuerza bruta sobre tokens, no.
const respond = guardedRespond({
  limiter: createRateLimiter({ windowMs: 60_000, max: 10 }),
  respond: (input) => rsvp.respond(input),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
})

export async function respondAction(_previous: RsvpActionState, formData: FormData): Promise<RsvpActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })
  const token = String(formData.get('token') ?? '')

  // El candado del evento protegido cierra también **las escrituras**. La página del
  // invitado es un render; esto es un extremo HTTP público, y con el enlace en la mano se
  // podría confirmar sin pasar nunca por la puerta de la contraseña.
  const group = await guests.resolveByToken(token)
  if (!isErr(group) && !(await eventUnlocked(group.value.eventId))) {
    // El mismo `not_found` que da un token desconocido: distinguir «existe pero está
    // cerrado» de «no existe» confirmaría que el enlace es bueno.
    return { status: 'error', message: 'invitation_not_found' }
  }

  const outcome = await respond({ ip, token, payload: Object.fromEntries(formData) })
  if (outcome.status === 'success') revalidatePath(`/i/${token}`)
  return outcome
}
