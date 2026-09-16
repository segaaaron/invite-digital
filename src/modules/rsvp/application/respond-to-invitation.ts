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
  async (input: {
    token: string
    attending: number
    responderName: string | null
    message: string | null
  }): Promise<Result<RsvpResponse, RsvpError>> =>
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

        /**
         * **Una sola respuesta por grupo.**
         *
         * El enlace circula por WhatsApp y acaba en el chat de toda la familia: si se pudiera
         * responder una y otra vez, cualquiera podría cambiar lo que dijeron los demás —o
         * inflar la cuenta— sin que nadie se enterase. Con una sola, reenviarlo no sirve de
         * nada: lo que hay es un resumen de lo ya contestado.
         *
         * Equivocarse tiene salida, pero por el panel: el atelier reabre esa respuesta y queda
         * anotado quién lo hizo.
         */
        const anterior = await deps.rsvp.latestFor(group.value.id)
        const reabierto = anterior === null ? null : await deps.rsvp.reopenedAtFor(group.value.id)
        // Reabrir vale para **la respuesta siguiente**: si la marca es anterior a lo ya
        // contestado, es de una corrección que ya se usó.
        if (anterior !== null && (reabierto === null || reabierto.getTime() <= anterior.respondedAt.getTime())) {
          return err(rsvpError('already_answered', `El grupo ${group.value.id} ya respondió el ${anterior.respondedAt.toISOString()}`))
        }

        const response = createRsvpResponse(
          {
            id: deps.ids(),
            guestGroupId: group.value.id,
            attending: input.attending,
            responderName: input.responderName,
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
