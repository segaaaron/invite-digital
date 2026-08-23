import { attempt, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from '../domain/errors'
import type { GuestGroupRepository } from './ports'

/**
 * Marca —o desmarca— que la invitación de un grupo ya se repartió.
 *
 * Es una marca del atelier, **no una prueba de entrega**: el enlace se manda por
 * WhatsApp, por correo o en papel, y ninguno de esos caminos avisa de vuelta. Llamarlo
 * «entregado» sería afirmar algo que nadie ha comprobado.
 */
export const markInvitationSent =
  (deps: { groups: GuestGroupRepository; clock: () => Date }) =>
  async (input: { id: string; sent: boolean }): Promise<Result<null, GuestError>> =>
    attempt<null, GuestError>(
      async () => {
        await deps.groups.markSent(input.id, input.sent ? deps.clock() : null)
        return ok(null)
      },
      (cause) => guestError('storage_failure', `No se pudo marcar el envío: ${String(cause)}`),
    )
