import { attempt, err, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { guestError, type GuestError } from '../domain/errors'
import type { GuestGroupRepository } from './ports'

export type ResentInvitation = { readonly token: string; readonly label: string }

/**
 * Vuelve a repartir la invitación de un grupo: **acuña un token nuevo** y deja el
 * anterior inservible.
 *
 * No hay forma de «volver a enseñar» el enlace viejo —en la base solo estaba su hash— y
 * tampoco sería buena idea: si hizo falta reenviarlo es porque se perdió, y un enlace
 * perdido pudo acabar en cualquier parte. Rotarlo cierra esa puerta.
 *
 * El RSVP, la mesa y el pase de la puerta no se tocan: son del grupo, no del token.
 *
 * Un grupo revocado **no** se reenvía: revocar es una decisión que hay que deshacer a
 * propósito, no de refilón al pulsar «reenviar».
 */
export const resendInvitation =
  (deps: { groups: GuestGroupRepository; minter: Minter; clock: () => Date }) =>
  async (input: { id: string }): Promise<Result<ResentInvitation, GuestError>> =>
    attempt<ResentInvitation, GuestError>(
      async () => {
        const row = await deps.groups.findById(input.id)
        if (row === null) return err(guestError('not_found', 'El grupo no existe'))
        if (row.revokedAt !== null) {
          return err(guestError('revoked', 'Esta invitación está revocada: reactívala antes de volver a repartirla.'))
        }

        const minted = deps.minter.mint()
        await deps.groups.replaceToken(input.id, minted.hash)
        await deps.groups.markSent(input.id, deps.clock())

        return ok({ token: minted.token, label: row.label })
      },
      (cause) => guestError('storage_failure', `No se pudo reenviar la invitación: ${String(cause)}`),
    )
