import { attempt, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from '../domain/errors'
import type { SessionRepository, TokenMinter } from './ports'

export const signOut =
  (deps: { sessions: SessionRepository; minter: TokenMinter }) =>
  async (token: string): Promise<Result<null, IdentityError>> =>
    attempt(
      async () => {
        await deps.sessions.deleteByTokenHash(deps.minter.hashOf(token))
        return ok(null)
      },
      (cause) => identityError('storage_failure', `No se pudo cerrar la sesión: ${String(cause)}`),
    )
