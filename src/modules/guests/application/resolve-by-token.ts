import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { guestError, type GuestError } from '../domain/errors'
import { createGuestGroup, isRevoked, type GuestGroup } from '../domain/guest-group'
import type { GuestGroupRepository } from './ports'

export const resolveByToken =
  (deps: { groups: GuestGroupRepository; minter: Minter; clock: () => Date }) =>
  async (token: string): Promise<Result<GuestGroup, GuestError>> =>
    attempt<GuestGroup, GuestError>(
      async () => {
        const row = await deps.groups.findByTokenHash(deps.minter.hashOf(token))
        // Un token desconocido y uno revocado acaban los dos en 404 de cara afuera; se
        // separan aquí solo para el registro del servidor.
        if (row === null) return err(guestError('not_found', 'Token sin grupo'))

        const group = createGuestGroup(row)
        if (isErr(group)) return group
        if (isRevoked(group.value)) return err(guestError('revoked', `Invitación revocada: ${group.value.id}`))

        // `opened_at` es telemetría de infraestructura, no dominio: se escribe una sola
        // vez y ninguna regla de negocio depende de ella.
        if (row.openedAt === null) await deps.groups.markOpened(group.value.id, deps.clock())

        return ok(group.value)
      },
      (cause) => guestError('storage_failure', `No se pudo resolver el token: ${String(cause)}`),
    )
