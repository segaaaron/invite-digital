import { attempt, err, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from '../domain/errors'

type Deps = {
  findActor(userId: string): Promise<{ id: string; email: string; role: string; mustChangePassword: boolean } | null>
  /** Hash nuevo y marca de provisional **en la misma escritura**. */
  setProvisionalPassword(userId: string, passwordHash: string): Promise<void>
  closeSessions(userId: string): Promise<void>
  hash(password: string): Promise<string>
  generate(): string
}

/**
 * «Restablecer acceso»: el cliente no puede entrar. El admin le da una contraseña provisional
 * —que el panel le obliga a cambiar— y le cierra todas las sesiones. Nunca se guarda ni se
 * enseña la contraseña de nadie: se crea una nueva, se muestra una vez y se manda por correo.
 *
 * **Solo sobre clientes.** Sobre un admin o un atelier sería una forma de quedarse con una
 * cuenta con más poder escribiendo su id.
 */
export const resetClientAccess =
  (deps: Deps) =>
  async (userId: string): Promise<Result<{ email: string; password: string }, IdentityError>> =>
    attempt(
      async () => {
        const cuenta = await deps.findActor(userId)
        if (cuenta === null || cuenta.role !== 'cliente') {
          return err(identityError('invalid_credentials', `Restablecer acceso rechazado para ${userId}: no es una cuenta de cliente`))
        }
        const password = deps.generate()
        await deps.setProvisionalPassword(cuenta.id, await deps.hash(password))
        await deps.closeSessions(cuenta.id)
        return ok({ email: cuenta.email, password })
      },
      (cause) => identityError('storage_failure', `No se pudo restablecer el acceso: ${String(cause)}`),
    )
