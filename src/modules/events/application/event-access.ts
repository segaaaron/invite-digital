import { attempt, err, ok, type Result } from '@/shared/result'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

/**
 * El mismo contrato que usa la identidad del atelier: `verify(password, hash)`, en ese
 * orden. Invertirlo compila igual —son dos cadenas— y hace que **ninguna** contraseña
 * valide jamás, sin un solo error en el registro.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}

export interface AccessRepository {
  /** Guarda el hash, o `null` para volver el evento público. */
  setPasswordHash(eventId: string, hash: string | null): Promise<void>
  passwordHashOf(eventId: string): Promise<string | null>
}

const MINIMO = 6

/**
 * Pone o quita la contraseña de acceso de un evento.
 *
 * Se guarda el hash y nunca la contraseña, igual que con las sesiones del atelier: si
 * alguien lee la base, no encuentra nada con lo que entrar.
 */
export const setEventPassword =
  (deps: { events: EventRepository; access: AccessRepository; hasher: PasswordHasher }) =>
  async (input: { eventId: string; password: string | null }): Promise<Result<null, EventError>> =>
    attempt<null, EventError>(
      async () => {
        const row = await deps.events.findById(input.eventId)
        if (row === null) return err(eventError('not_found', 'El evento no existe'))

        if (input.password === null) {
          await deps.access.setPasswordHash(input.eventId, null)
          return ok(null)
        }

        const limpia = input.password.trim()
        if (limpia.length < MINIMO) {
          return err(eventError('invalid_title', `La contraseña necesita al menos ${MINIMO} caracteres`))
        }

        await deps.access.setPasswordHash(input.eventId, await deps.hasher.hash(limpia))
        return ok(null)
      },
      (cause) => eventError('storage_failure', `No se pudo guardar la contraseña: ${String(cause)}`),
    )

/**
 * Comprueba la contraseña de un evento.
 *
 * Un evento sin contraseña devuelve `true` sin preguntar nada: es público con el enlace,
 * que es como funcionaba todo hasta esta rebanada.
 */
export const checkEventPassword =
  (deps: { access: AccessRepository; hasher: PasswordHasher }) =>
  async (input: { eventId: string; password: string }): Promise<Result<boolean, EventError>> =>
    attempt<boolean, EventError>(
      async () => {
        const hash = await deps.access.passwordHashOf(input.eventId)
        if (hash === null) return ok(true)
        return ok(await deps.hasher.verify(input.password, hash))
      },
      (cause) => eventError('storage_failure', `No se pudo comprobar la contraseña: ${String(cause)}`),
    )
