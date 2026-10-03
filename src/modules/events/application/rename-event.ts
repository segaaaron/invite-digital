import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createEvent, type Event } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

/**
 * Cambia **solo el título** del evento: el nombre con el que se ve en el panel.
 *
 * Existe porque el evento que nace de un pedido se llama como quien compró («VALERIA») y la
 * invitación dice «Amanda · 15 años». `updateEvent` no sirve: arrastra el `slug` (los enlaces),
 * el diseño, el estado y la fecha, que no son del cliente.
 */
export const renombrarEvento =
  (deps: { events: EventRepository }) =>
  async (input: { eventId: string; title: string }): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const actual = await deps.events.findById(input.eventId)
        if (actual === null) return err(eventError('not_found', `No existe el evento ${input.eventId}`))
        const evento = createEvent({ ...actual, title: input.title })
        if (isErr(evento)) return evento
        await deps.events.update(evento.value)
        return ok(evento.value)
      },
      (cause) => eventError('storage_failure', `No se pudo renombrar el evento: ${String(cause)}`),
    )
