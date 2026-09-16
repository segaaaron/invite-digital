import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createCredential } from '../domain/credential'
import { identityError, type IdentityError } from '../domain/errors'
import { nextExpiry } from '../domain/session'
import type { PasswordHasher, SessionRepository, TokenMinter, UserRepository } from './ports'

// Hash de una contraseña que no existe. Verificar contra él cuesta lo mismo que
// verificar uno real, así que el tiempo de respuesta no distingue "no hay usuario" de
// "contraseña mala".
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$0000000000000000000000000000000000000000000'

export const signIn =
  (deps: {
    users: UserRepository
    sessions: SessionRepository
    hasher: PasswordHasher
    minter: TokenMinter
    clock: () => Date
  }) =>
  async (input: {
    email: string
    password: string
    /** «iPhone · Safari», para reconocer la sesión en Mi cuenta. */
    device?: string
  }): Promise<Result<{ token: string; expiresAt: Date }, IdentityError>> =>
    attempt(
      async () => {
        const credential = createCredential(input)
        // Un correo mal escrito o una contraseña corta se responden como credenciales
        // inválidas: decir cuál de las dos falló ayuda a quien prueba a ciegas.
        if (isErr(credential)) {
          await deps.hasher.verify(input.password, DUMMY_HASH)
          return err(identityError('invalid_credentials', credential.error.detail))
        }

        const user = await deps.users.findByEmail(credential.value.email)
        const matches = await deps.hasher.verify(credential.value.password, user?.passwordHash ?? DUMMY_HASH)

        if (user === null || !matches) {
          return err(identityError('invalid_credentials', `Intento fallido para ${credential.value.email}`))
        }

        const { token, hash } = deps.minter.mint()
        const expiresAt = nextExpiry(deps.clock())
        await deps.sessions.create({ userId: user.id, tokenHash: hash, expiresAt, device: input.device ?? null })

        return ok({ token, expiresAt })
      },
      (cause) => identityError('storage_failure', `No se pudo iniciar sesión: ${String(cause)}`),
    )
