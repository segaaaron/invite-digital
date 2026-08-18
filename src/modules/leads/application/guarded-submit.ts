import { isErr, type Result } from '@/shared/result'
import type { LeadError, LeadErrorKind } from '../domain/errors'
import type { RateLimiter } from './rate-limit'

export type ConsultationOutcome = {
  status: 'success' | 'error'
  message: LeadErrorKind | 'too_many_requests' | ''
}

/**
 * Coordination between the rate limiter and the use case, kept free of `next/headers`
 * so it can be tested: the Server Action only reads the request and delegates here.
 * Only the `kind` crosses back to the client — `detail` can carry the submitted email
 * and belongs in the server log.
 */
export const guardedSubmit =
  (deps: {
    limiter: RateLimiter
    submit: (payload: unknown) => Promise<Result<{ ok: true }, LeadError>>
    clock: () => number
    log: (message: string, kind: string, detail: string) => void
  }) =>
  async ({ ip, payload }: { ip: string; payload: unknown }): Promise<ConsultationOutcome> => {
    if (deps.limiter.isLimited(ip, deps.clock())) {
      return { status: 'error', message: 'too_many_requests' }
    }

    const result = await deps.submit(payload)

    if (isErr(result)) {
      deps.log('consulta rechazada', result.error.kind, result.error.detail)
      return { status: 'error', message: result.error.kind }
    }

    return { status: 'success', message: '' }
  }
