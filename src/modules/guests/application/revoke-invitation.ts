import { attempt, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from '../domain/errors'
import type { GuestGroupRepository } from './ports'

export const revokeInvitation =
  (deps: { groups: GuestGroupRepository; clock: () => Date }) =>
  async (groupId: string): Promise<Result<null, GuestError>> =>
    attempt<null, GuestError>(
      async () => {
        // Revocar no borra: el histórico de respuestas sigue contando para el atelier.
        await deps.groups.revoke(groupId, deps.clock())
        return ok(null)
      },
      (cause) => guestError('storage_failure', `No se pudo revocar la invitación: ${String(cause)}`),
    )
