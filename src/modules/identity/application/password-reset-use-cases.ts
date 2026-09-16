import { timingSafeEqual } from 'node:crypto'
import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createCredential } from '../domain/credential'
import { identityError, type IdentityError } from '../domain/errors'
import { canAttemptReset, newOtp, normalizeOtp, otpExpiry } from '../domain/password-reset'
import type { PasswordHasher, PasswordResetRepository, SessionRepository, TokenMinter, UserRepository } from './ports'

type Deps = {
  users: UserRepository
  resets: PasswordResetRepository
  minter: TokenMinter
  clock: () => Date
}

/**
 * Pide un código para recuperar la contraseña.
 *
 * **Devuelve el código en claro una sola vez**, para que la frontera lo mande por correo.
 * En la base solo queda su SHA-256, como los tokens de sesión y los de invitado: de ahí no
 * se saca ninguno.
 *
 * **Un correo que no existe se responde igual que uno que sí.** Quien pide el código no
 * puede averiguar quién tiene cuenta aquí — sería una lista de clientes del atelier — así
 * que devuelve `ok` con `code: null` y quien llama manda o no manda, sin decir nada
 * distinto en pantalla.
 */
export const requestPasswordReset =
  (deps: Deps) =>
  async (rawEmail: string): Promise<Result<{ userId: string; code: string } | null, IdentityError>> =>
    attempt(
      async () => {
        const email = rawEmail.trim().toLowerCase()
        const userId = await deps.users.findIdByEmail(email)
        if (userId === null) return ok(null)

        const code = newOtp()
        await deps.resets.issue({
          userId,
          codeHash: deps.minter.hashOf(code),
          expiresAt: otpExpiry(deps.clock()),
        })

        return ok({ userId, code })
      },
      (cause) => identityError('storage_failure', `No se pudo emitir el código: ${String(cause)}`),
    )

/**
 * Cambia la contraseña presentando el código.
 *
 * El código se compara en **tiempo constante**: con `===` sobre el hash, el tiempo de
 * respuesta filtra cuántos bytes coinciden. Es la misma razón por la que la cookie de
 * desbloqueo de un evento se compara así.
 *
 * Al acertar se gasta el código, se escribe la contraseña —que apaga la marca de
 * provisional— y **se cierran todas las sesiones**: si alguien había entrado con la
 * anterior, deja de estar dentro en ese mismo instante.
 */
export const confirmPasswordReset =
  (deps: Deps & { sessions: SessionRepository; hasher: PasswordHasher }) =>
  async (input: { email: string; code: string; password: string }): Promise<Result<null, IdentityError>> =>
    attempt(
      async () => {
        const email = input.email.trim().toLowerCase()
        const code = normalizeOtp(input.code)
        if (code === null) return err(identityError('invalid_credentials', 'El código no tiene forma de código.'))

        const userId = await deps.users.findIdByEmail(email)
        if (userId === null) return err(identityError('invalid_credentials', `Sin cuenta para ${email}`))

        const gastado = await gastarCodigo(deps, userId, code)
        if (isErr(gastado)) return gastado

        // La nueva pasa por la misma puerta que un alta: mismo mínimo, mismas reglas.
        const credential = createCredential({ email, password: input.password })
        if (isErr(credential)) return credential

        await deps.resets.consume(gastado.value, deps.clock())
        await deps.users.updatePassword(userId, await deps.hasher.hash(credential.value.password))
        await deps.sessions.deleteByUser(userId)

        return ok(null)
      },
      (cause) => identityError('storage_failure', `No se pudo cambiar la contraseña: ${String(cause)}`),
    )

/**
 * Comprueba el código del correo de ese usuario. Devuelve el id del código para gastarlo
 * **después** de validar lo demás; un fallo cuenta el intento antes de responder.
 *
 * Se compara en **tiempo constante**: con `===` sobre el hash, el tiempo de respuesta filtra
 * cuántos bytes coinciden.
 */
async function gastarCodigo(
  deps: { resets: PasswordResetRepository; minter: TokenMinter; clock: () => Date },
  userId: string,
  code: string,
): Promise<Result<string, IdentityError>> {
  const reset = await deps.resets.findLive(userId)
  if (reset === null || !canAttemptReset(reset, deps.clock())) {
    return err(identityError('invalid_credentials', 'Código caducado, gastado o agotado.'))
  }
  const entrante = deps.minter.hashOf(code)
  const coincide = entrante.length === reset.codeHash.length && timingSafeEqual(entrante, reset.codeHash)
  if (!coincide) {
    // Se cuenta **antes** de responder: es lo único que impide probar el millón de
    // combinaciones de seis dígitos.
    await deps.resets.countAttempt(reset.id)
    return err(identityError('invalid_credentials', 'Código incorrecto.'))
  }
  return ok(reset.id)
}

/**
 * Cierra las demás sesiones de la cuenta, con el código que llegó a su correo.
 *
 * Con la contraseña compartida todos entran como la misma cuenta: lo único que distingue al
 * dueño es su correo. Sin el código, cualquiera que entrara podría echar a los demás, y al
 * dueño el primero.
 */
export const closeOtherSessions =
  (deps: { resets: PasswordResetRepository; sessions: SessionRepository; minter: TokenMinter; clock: () => Date }) =>
  async (input: { userId: string; sessionId: string; code: string }): Promise<Result<null, IdentityError>> =>
    attempt(
      async () => {
        const code = normalizeOtp(input.code)
        if (code === null) return err(identityError('invalid_credentials', 'El código no tiene forma de código.'))
        const gastado = await gastarCodigo(deps, input.userId, code)
        if (isErr(gastado)) return gastado
        await deps.resets.consume(gastado.value, deps.clock())
        await deps.sessions.deleteOthers(input.userId, input.sessionId)
        return ok(null)
      },
      (cause) => identityError('storage_failure', `No se pudieron cerrar las sesiones: ${String(cause)}`),
    )

/** Pide un código para una cuenta con sesión: el correo sale de la sesión, nunca del formulario. */
export const requestAccountCode = (deps: Deps) => async (userId: string): Promise<Result<string, IdentityError>> =>
  attempt(
    async () => {
      const code = newOtp()
      await deps.resets.issue({ userId, codeHash: deps.minter.hashOf(code), expiresAt: otpExpiry(deps.clock()) })
      return ok(code)
    },
    (cause) => identityError('storage_failure', `No se pudo emitir el código: ${String(cause)}`),
  )
