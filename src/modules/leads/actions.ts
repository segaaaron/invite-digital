'use server'

import { headers } from 'next/headers'
import { leads } from '@/app/composition/container'
import { isErr } from '@/shared/result'
import { createRateLimiter } from './application/rate-limit'
import type { LeadErrorKind } from './domain/errors'

export type ConsultationActionState = {
  status: 'idle' | 'success' | 'error'
  message: LeadErrorKind | 'too_many_requests' | ''
}

const limiter = createRateLimiter({ windowMs: 60_000, max: 3 })

export async function submitConsultationAction(
  _previous: ConsultationActionState,
  formData: FormData,
): Promise<ConsultationActionState> {
  const headerBag = await headers()
  const forwardedFor = headerBag.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedFor && forwardedFor.length > 0 ? forwardedFor : 'desconocida'

  if (limiter.isLimited(ip, Date.now())) {
    return { status: 'error', message: 'too_many_requests' }
  }

  const result = await leads.submitConsultation(Object.fromEntries(formData))

  // Only the `kind` crosses to the client; `detail` can carry the submitted email
  // and belongs in the server log, not in the browser.
  if (isErr(result)) {
    console.error('consulta rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  return { status: 'success', message: '' }
}
