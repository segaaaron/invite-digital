import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createCredential } from '../domain/credential'
import { identityError, type IdentityError } from '../domain/errors'
import type { PasswordHasher, SessionRepository, UserRepository } from './ports'

/**
 * Cambiar la propia contraseña.
 *
 * Existe porque las cuentas las da de alta otro —el admin en `/panel/admin/usuarios`, el
 * atelier al dar acceso a su cliente— y esa contraseña viaja por WhatsApp. Sin esta
 * pantalla, la clave que escribió otra persona vale para siempre.
 *
 * **Pide la actual.** Una sesión abierta en un ordenador prestado no puede bastar para
 * quedarse con la cuenta.
 *
 * **Y cierra todas las sesiones, la de quien la cambia incluida.** Si se cambia porque se
 * filtró, dejar viva la del intruso es cerrar con llave dejando la puerta abierta. Quien
 * la cambia vuelve a entrar con la nueva, que es lo que acaba de escribir.
 */
export const changePassword =
  (deps: { users: UserRepository; sessions: SessionRepository; hasher: PasswordHasher }) =>
  async (input: {
    userId: string
    email: string
    current: string
    next: string
  }): Promise<Result<null, IdentityError>> =>
    attempt(
      async () => {
        // El correo sale de la sesión, nunca del formulario: si viniera de fuera, esto
        // sería una forma de cambiarle la contraseña a otro conociendo la suya.
        const user = await deps.users.findByEmail(input.email)
        const matches = await deps.hasher.verify(input.current, user?.passwordHash ?? '')

        if (user === null || !matches) {
          return err(identityError('invalid_credentials', `Contraseña actual incorrecta para ${input.email}`))
        }

        // La nueva pasa por la misma puerta que un alta: mismo mínimo, mismas reglas.
        const credential = createCredential({ email: input.email, password: input.next })
        if (isErr(credential)) return credential

        await deps.users.updatePassword(input.userId, await deps.hasher.hash(credential.value.password))
        await deps.sessions.deleteByUser(input.userId)

        return ok(null)
      },
      (cause) => identityError('storage_failure', `No se pudo cambiar la contraseña: ${String(cause)}`),
    )
