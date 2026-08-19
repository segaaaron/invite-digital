import { attempt, isErr, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from '../domain/errors'
import { createGuestGroup, type GuestGroup } from '../domain/guest-group'
import type { GuestGroupRepository } from './ports'

export const listGuestGroups =
  (deps: { groups: GuestGroupRepository }) =>
  async (eventId: string): Promise<Result<GuestGroup[], GuestError>> =>
    attempt<GuestGroup[], GuestError>(
      async () => {
        const rows = await deps.groups.listByEvent(eventId)
        const built: GuestGroup[] = []

        for (const row of rows) {
          const group = createGuestGroup(row)
          if (isErr(group)) return group
          built.push(group.value)
        }

        return ok(built)
      },
      (cause) => guestError('storage_failure', `No se pudieron leer los grupos: ${String(cause)}`),
    )
