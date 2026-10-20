import { err, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from './errors'
import { esCorreo } from '@/shared/correo'

export type Credential = { readonly email: string; readonly password: string }

const MIN_PASSWORD_LENGTH = 12
export { esCorreo }

export function createCredential(input: { email: string; password: string }): Result<Credential, IdentityError> {
  const email = input.email.trim().toLowerCase()
  if (!esCorreo(email)) {
    return err(identityError('invalid_email', `Correo inválido: ${input.email}`))
  }

  // La contraseña no se recorta: un espacio al final es un carácter que el usuario
  // eligió, y recortarlo haría que la guardada no sea la que él escribe.
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return err(identityError('weak_password', `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres`))
  }

  return ok({ email, password: input.password })
}
