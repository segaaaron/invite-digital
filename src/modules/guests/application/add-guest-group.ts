import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { guestError, type GuestError } from '../domain/errors'
import { createGuestGroup, type GuestGroup } from '../domain/guest-group'
import type { GuestGroupRepository } from './ports'

export type AddedGuestGroup = { readonly group: GuestGroup; readonly token: string }

/**
 * Cuántos grupos admite el plan del evento. `null` es sin límite.
 *
 * Entra **como argumento**, no como una consulta que este módulo haga por su cuenta:
 * `guests` no importa el módulo de planes. Cuántos grupos caben es una regla comercial
 * que va a cambiar, y meterla aquí ataría para siempre dos módulos que hoy son
 * independientes. Quien resuelve la capacidad es la acción, que ya vive en la frontera
 * y puede hablar con el contenedor.
 */
export type GuestAllowance = { readonly maxGuestGroups: number | null }

export type AddGuestGroupInput = {
  eventId: string
  label: string
  seats: number
  allowance: GuestAllowance
  /** Cuántos grupos tiene ya el evento. El que se añade sería el siguiente. */
  currentGroups: number
}

export const addGuestGroup =
  (deps: { groups: GuestGroupRepository; minter: Minter; ids: () => string }) =>
  async (input: AddGuestGroupInput): Promise<Result<AddedGuestGroup, GuestError>> =>
    attempt<AddedGuestGroup, GuestError>(
      async () => {
        const limite = input.allowance.maxGuestGroups

        // Antes de acuñar nada. Acuñar el token, guardarlo y rechazar después dejaría un
        // enlace válido apuntando a un grupo que el atelier no llegó a crear.
        if (limite !== null && input.currentGroups >= limite) {
          return err(
            guestError(
              'plan_limit_reached',
              `El plan admite ${limite} grupos de invitados y el evento ya tiene ${input.currentGroups}.`,
            ),
          )
        }

        const group = createGuestGroup({
          id: deps.ids(),
          eventId: input.eventId,
          label: input.label,
          seats: input.seats,
          revokedAt: null,
        })
        if (isErr(group)) return group

        // El token en claro sale de aquí una sola vez, hacia quien lo va a entregar. Al
        // repositorio solo baja el hash.
        const { token, hash } = deps.minter.mint()
        await deps.groups.insert(group.value, hash)

        return ok({ group: group.value, token })
      },
      (cause) => guestError('storage_failure', `No se pudo crear el grupo: ${String(cause)}`),
    )
