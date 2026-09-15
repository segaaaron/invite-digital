import { isErr, type Result } from '@/shared/result'
import type { RateLimiter } from '@/shared/http/rate-limit'
import type { RsvpError, RsvpErrorKind } from '../domain/errors'
import type { RsvpResponse } from '../domain/rsvp-response'

export type RsvpOutcome =
  | { status: 'success'; attending: number; responderName: string | null }
  | { status: 'error'; message: RsvpErrorKind }

const readAnswer = (payload: unknown): { attending: number; responderName: string | null; message: string | null } | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const { attending, message, name } = payload as Record<string, unknown>

  // El formulario llega como texto; `Number('')` daría 0, que es una respuesta válida
  // ("no vamos") y no un campo vacío. Por eso se comprueba antes de convertir.
  if (typeof attending !== 'string' || attending.trim().length === 0) return null
  const parsed = Number(attending)
  if (!Number.isFinite(parsed)) return null

  return {
    attending: parsed,
    responderName: typeof name === 'string' ? name : null,
    message: typeof message === 'string' ? message : null,
  }
}

export const guardedRespond =
  (deps: {
    limiter: RateLimiter
    respond: (input: {
      token: string
      attending: number
      responderName: string | null
      message: string | null
    }) => Promise<Result<RsvpResponse, RsvpError>>
    clock: () => number
    log: (message: string, kind: string, detail: string) => void
  }) =>
  async ({ ip, token, payload }: { ip: string; token: string; payload: unknown }): Promise<RsvpOutcome> => {
    if (deps.limiter.isLimited(ip, deps.clock())) return { status: 'error', message: 'rate_limited' }

    const answer = readAnswer(payload)
    if (answer === null) return { status: 'error', message: 'invalid_payload' }

    const result = await deps.respond({ token, ...answer })
    if (isErr(result)) {
      // El detalle puede llevar el identificador del grupo: se queda en el registro del
      // servidor, nunca cruza al invitado.
      deps.log('respuesta rechazada', result.error.kind, result.error.detail)
      return { status: 'error', message: result.error.kind }
    }

    return { status: 'success', attending: result.value.attending, responderName: result.value.responderName }
  }
