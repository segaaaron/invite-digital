'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { rsvp } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
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

  const outcome = await respond({ ip, token, payload: Object.fromEntries(formData) })
  if (outcome.status === 'success') revalidatePath(`/i/${token}`)
  return outcome
}
