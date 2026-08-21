import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { acceptsResponses, type Event } from '@/modules/events'
import type { EventError } from '@/modules/events'
import type { GuestError, GuestGroup } from '@/modules/guests'
import { rsvpError, type RsvpError } from '../domain/errors'
import { createRsvpResponse, type RsvpResponse } from '../domain/rsvp-response'
import type { RsvpRepository } from './ports'

export const respondToInvitation =
  (deps: {
    resolveGroup: (token: string) => Promise<Result<GuestGroup, GuestError>>
    findEventById: (id: string) => Promise<Result<Event, EventError>>
    rsvp: RsvpRepository
    ids: () => string
    clock: () => Date
  }) =>
  async (input: { token: string; attending: number; message: string | null }): Promise<Result<RsvpResponse, RsvpError>> =>
    attempt<RsvpResponse, RsvpError>(
      async () => {
        const group = await deps.resolveGroup(input.token)
        if (isErr(group)) {
          return err(
            group.error.kind === 'revoked'
              ? rsvpError('invitation_revoked', group.error.detail)
              : rsvpError('invitation_not_found', group.error.detail),
          )
        }

        const event = await deps.findEventById(group.value.eventId)
        if (isErr(event)) return err(rsvpError('storage_failure', event.error.detail))

        const now = deps.clock()
        // El plazo se mide en días de calendario, no en el instante del servidor: el
        // corte es el día completo de la fecha límite.
        const today = now.toISOString().slice(0, 10)
        if (!acceptsResponses(event.value, today)) {
          return err(rsvpError('rsvp_closed', `Evento ${event.value.slug} cerrado el ${event.value.rsvpDeadline}`))
        }

        const response = createRsvpResponse(
          {
            id: deps.ids(),
            guestGroupId: group.value.id,
            attending: input.attending,
            message: input.message,
            respondedAt: now,
          },
          { seats: group.value.seats },
        )
        if (isErr(response)) return response

        await deps.rsvp.append(response.value)
        return ok(response.value)
      },
      (cause) => rsvpError('storage_failure', `No se pudo registrar la respuesta: ${String(cause)}`),
    )
