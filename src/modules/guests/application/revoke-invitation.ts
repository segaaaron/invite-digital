import { attempt, err, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from '../domain/errors'
import type { GuestGroupRepository } from './ports'

type Deps = { groups: GuestGroupRepository; clock: () => Date }
type Ref = { eventId: string; id: string }

/** Revocar no borra: el histórico de respuestas sigue contando para el atelier. */
export const revokeInvitation =
  (deps: Deps) =>
  async (input: Ref): Promise<Result<null, GuestError>> =>
    attempt<null, GuestError>(
      async () => {
        if ((await deps.groups.findById(input.eventId, input.id)) === null) {
          return err(guestError('not_found', 'La invitación no existe'))
        }
        await deps.groups.revoke(input.eventId, input.id, deps.clock())
        return ok(null)
      },
      (cause) => guestError('storage_failure', `No se pudo revocar la invitación: ${String(cause)}`),
    )

/**
 * Devuelve el acceso a una invitación revocada: su enlace y su pase vuelven a abrir.
 *
 * Revocar corta el paso por la puerta (la guarda de `register-arrival`), así que sin esta
 * vuelta atrás un clic de más dejaba a esa familia fuera del evento para siempre y sin
 * poder reenviarle nada. La confirmación, la mesa y el pase son del grupo, no del estado
 * revocado: al volver siguen donde estaban.
 *
 * Si no estaba revocada no toca la base, y lo dice: `ya_estaba`. Devolver `ok` a secas valía
 * hoy —el botón solo aparece si está revocada— pero dejaba a quien llame sin saber si devolvió
 * algo, y a la pantalla sin poder decir la verdad cuando otra pestaña se adelantó.
 */
export const restoreInvitation =
  (deps: Deps) =>
  async (input: Ref): Promise<Result<'devuelta' | 'ya_estaba', GuestError>> =>
    attempt<'devuelta' | 'ya_estaba', GuestError>(
      async () => {
        const fila = await deps.groups.findById(input.eventId, input.id)
        if (fila === null) return err(guestError('not_found', 'La invitación no existe'))
        if (fila.revokedAt === null) return ok('ya_estaba')

        await deps.groups.restore(input.eventId, input.id)
        return ok('devuelta')
      },
      (cause) => guestError('storage_failure', `No se pudo devolver la invitación: ${String(cause)}`),
    )

/**
 * Permite a una invitación contestar otra vez. Se confirma una sola vez porque el enlace
 * acaba en el chat de toda la familia; cuando alguien se equivoca, lo corrige el atelier.
 */
export const reopenRsvp =
  (deps: Deps) =>
  async (input: Ref): Promise<Result<null, GuestError>> =>
    attempt<null, GuestError>(
      async () => {
        if ((await deps.groups.findById(input.eventId, input.id)) === null) {
          return err(guestError('not_found', 'La invitación no existe'))
        }
        await deps.groups.reopenRsvp(input.eventId, input.id, deps.clock())
        return ok(null)
      },
      (cause) => guestError('storage_failure', `No se pudo reabrir la confirmación: ${String(cause)}`),
    )
