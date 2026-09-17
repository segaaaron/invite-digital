import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import type { Event, EventError } from '@/modules/events'
import type { GuestError, GuestGroup } from '@/modules/guests'
import { rsvpError, type RsvpError } from '../domain/errors'
import type { LatestResponse, RsvpRepository } from './ports'

export type Invitation = {
  /** Con el código corto del pase, que el invitado ve bajo su QR. */
  readonly group: GuestGroup & { readonly passCode?: string | null }
  readonly event: Event
  readonly latest: LatestResponse | null
}

/**
 * Todo lo que la página del invitado necesita, en una sola llamada: su grupo, el evento
 * al que pertenece y su última respuesta si ya contestó.
 */
export const getInvitation =
  (deps: {
    resolveGroup: (token: string) => Promise<Result<GuestGroup & { readonly passCode?: string | null }, GuestError>>
    findEventById: (id: string) => Promise<Result<Event, EventError>>
    rsvp: RsvpRepository
  }) =>
  async (token: string): Promise<Result<Invitation, RsvpError>> =>
    attempt<Invitation, RsvpError>(
      async () => {
        const group = await deps.resolveGroup(token)
        if (isErr(group)) {
          // El fallo de almacenamiento se distingue de los otros dos: uno es 503 y los
          // otros 404.
          if (group.error.kind === 'storage_failure') return err(rsvpError('storage_failure', group.error.detail))
          return err(
            group.error.kind === 'revoked'
              ? rsvpError('invitation_revoked', group.error.detail)
              : rsvpError('invitation_not_found', group.error.detail),
          )
        }

        const event = await deps.findEventById(group.value.eventId)
        if (isErr(event)) return err(rsvpError('storage_failure', event.error.detail))

        // Un evento en borrador no tiene enlaces activos: su invitación no existe
        // todavía de cara al invitado.
        if (event.value.status === 'draft') {
          return err(rsvpError('invitation_not_found', `Evento ${event.value.slug} en borrador`))
        }

        return ok({ group: group.value, event: event.value, latest: await deps.rsvp.latestFor(group.value.id) })
      },
      (cause) => rsvpError('storage_failure', `No se pudo leer la invitación: ${String(cause)}`),
    )
