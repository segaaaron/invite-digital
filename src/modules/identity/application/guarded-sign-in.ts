import { isErr, type Result } from '@/shared/result'
import type { RateLimiter } from '@/shared/http/rate-limit'
import type { IdentityError } from '../domain/errors'

export type SignInOutcome =
  | { status: 'success'; token: string; expiresAt: Date }
  | { status: 'error'; message: 'invalid_credentials' | 'too_many_attempts' | 'storage_failure' }

const readCredentials = (payload: unknown): { email: string; password: string } | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const { email, password } = payload as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string') return null
  return { email, password }
}

/**
 * Dos limitadores: por IP, contra quien prueba muchas cuentas desde un sitio; y por
 * cuenta, contra quien prueba una cuenta desde muchas IP. Ninguno solo cubre al otro.
 */
export const guardedSignIn =
  (deps: {
    ipLimiter: RateLimiter
    accountLimiter: RateLimiter
    signIn: (input: { email: string; password: string }) => Promise<Result<{ token: string; expiresAt: Date }, IdentityError>>
    clock: () => number
    log: (message: string, kind: string, detail: string) => void
  }) =>
  async ({ ip, payload }: { ip: string; payload: unknown }): Promise<SignInOutcome> => {
    const now = deps.clock()
    if (deps.ipLimiter.isLimited(ip, now)) return { status: 'error', message: 'too_many_attempts' }

    const credentials = readCredentials(payload)
    if (credentials === null) return { status: 'error', message: 'invalid_credentials' }

    const account = credentials.email.trim().toLowerCase()
    if (deps.accountLimiter.isLimited(account, now)) return { status: 'error', message: 'too_many_attempts' }

    const result = await deps.signIn(credentials)
    if (isErr(result)) {
      deps.log('inicio de sesión rechazado', result.error.kind, result.error.detail)
      return { status: 'error', message: result.error.kind === 'storage_failure' ? 'storage_failure' : 'invalid_credentials' }
    }

    return { status: 'success', token: result.value.token, expiresAt: result.value.expiresAt }
  }
