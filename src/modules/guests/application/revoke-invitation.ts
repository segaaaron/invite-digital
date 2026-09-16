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
