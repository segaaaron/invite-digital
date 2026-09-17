import { attempt, err, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from '../domain/errors'
import { isSessionExpired, nextExpiry, shouldRenew } from '../domain/session'
import type { SessionRepository, TokenMinter } from './ports'

const CINCO_MINUTOS = 5 * 60_000

export type AuthenticatedSession = {
  readonly sessionId: string
  readonly userId: string
  readonly renewedUntil: Date | null
  /** El modo soporte abierto, leído en la misma consulta: sin él no hace falta otra. */
  readonly supportSessionId: string | null
  /** «iPhone · Safari», o `null` en las sesiones abiertas antes de guardarlo. */
  readonly device: string | null
}

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

        // El último uso, para la lista de sesiones de Mi cuenta. Cada cinco minutos como mucho:
        // escribir en cada petición sería una escritura por página vista.
        const ultima = session.lastSeenAt ?? null
        if (ultima === null || now.getTime() - ultima.getTime() >= CINCO_MINUTOS) await deps.sessions.seen(session.id, now)

        if (!shouldRenew(session, now)) return ok({ sessionId: session.id, userId: session.userId, renewedUntil: null, supportSessionId: session.supportSessionId ?? null, device: session.device ?? null })

        const renewedUntil = nextExpiry(now)
        await deps.sessions.touch(session.id, renewedUntil)
        return ok({ sessionId: session.id, userId: session.userId, renewedUntil, supportSessionId: session.supportSessionId ?? null, device: session.device ?? null })
      },
      (cause) => identityError('storage_failure', `No se pudo validar la sesión: ${String(cause)}`),
    )
