import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createEvent, type Event, type EventInput } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export const createEventUseCase =
  (deps: { events: EventRepository; ids: () => string }) =>
  async (input: Omit<EventInput, 'id'>): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const event = createEvent({ ...input, id: deps.ids() })
        if (isErr(event)) return event

        // El índice único de la base es la última palabra, pero comprobar antes permite
        // devolver `duplicate_slug` en vez de un fallo de almacenamiento sin sentido.
        if (await deps.events.findBySlug(event.value.slug)) {
          return err(eventError('duplicate_slug', `Ya existe un evento con el slug ${event.value.slug}`))
        }

        await deps.events.insert(event.value)
        return ok(event.value)
      },
      (cause) => eventError('storage_failure', `No se pudo crear el evento: ${String(cause)}`),
    )
