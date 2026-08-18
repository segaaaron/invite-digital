'use server'

import { headers } from 'next/headers'
import { leads } from '@/app/composition/container'
import { clientIpFrom } from './application/client-ip'
import { guardedSubmit, type ConsultationOutcome } from './application/guarded-submit'
import { createRateLimiter } from './application/rate-limit'

export type ConsultationActionState = ConsultationOutcome | { status: 'idle'; message: '' }

const submitGuarded = guardedSubmit({
  limiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
  submit: (payload) => leads.submitConsultation(payload),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
})

export async function submitConsultationAction(
  _previous: ConsultationActionState,
  formData: FormData,
): Promise<ConsultationActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({
    realIp: headerBag.get('x-real-ip'),
    forwardedFor: headerBag.get('x-forwarded-for'),
  })

  return submitGuarded({ ip, payload: Object.fromEntries(formData) })
}
