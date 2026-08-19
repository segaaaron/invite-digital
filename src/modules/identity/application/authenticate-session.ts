import { attempt, err, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from '../domain/errors'
import { isSessionExpired, nextExpiry, shouldRenew } from '../domain/session'
import type { SessionRepository, TokenMinter } from './ports'

export type AuthenticatedSession = { readonly userId: string; readonly renewedUntil: Date | null }

export const authenticateSession =
  (deps: { sessions: SessionRepository; minter: TokenMinter; clock: () => Date }) =>
  async (token: string | null): Promise<Result<AuthenticatedSession, IdentityError>> =>
    attempt<AuthenticatedSession, IdentityError>(
      async () => {
        if (token === null || token.length === 0) {
          return err(identityError('session_expired', 'Petición sin cookie de sesión'))
        }

        const now = deps.clock()
        const session = await deps.sessions.findByTokenHash(deps.minter.hashOf(token))

        if (session === null || isSessionExpired(session, now)) {
          return err(identityError('session_expired', 'Sesión inexistente o caducada'))
        }

        if (!shouldRenew(session, now)) return ok({ userId: session.userId, renewedUntil: null })

        const renewedUntil = nextExpiry(now)
        await deps.sessions.touch(session.id, renewedUntil)
        return ok({ userId: session.userId, renewedUntil })
      },
      (cause) => identityError('storage_failure', `No se pudo validar la sesión: ${String(cause)}`),
    )
