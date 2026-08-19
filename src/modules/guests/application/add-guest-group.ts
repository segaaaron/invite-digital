import { attempt, isErr, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { guestError, type GuestError } from '../domain/errors'
import { createGuestGroup, type GuestGroup } from '../domain/guest-group'
import type { GuestGroupRepository } from './ports'

export type AddedGuestGroup = { readonly group: GuestGroup; readonly token: string }

export const addGuestGroup =
  (deps: { groups: GuestGroupRepository; minter: Minter; ids: () => string }) =>
  async (input: { eventId: string; label: string; seats: number }): Promise<Result<AddedGuestGroup, GuestError>> =>
    attempt<AddedGuestGroup, GuestError>(
      async () => {
        const group = createGuestGroup({ ...input, id: deps.ids(), revokedAt: null })
        if (isErr(group)) return group

        // El token en claro sale de aquí una sola vez, hacia quien lo va a entregar. Al
        // repositorio solo baja el hash.
        const { token, hash } = deps.minter.mint()
        await deps.groups.insert(group.value, hash)

        return ok({ group: group.value, token })
      },
      (cause) => guestError('storage_failure', `No se pudo crear el grupo: ${String(cause)}`),
    )
