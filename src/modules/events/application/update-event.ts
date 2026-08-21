import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createEvent, type Event, type EventInput } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export const updateEventUseCase =
  (deps: { events: EventRepository }) =>
  async (input: EventInput): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const event = createEvent(input)
        if (isErr(event)) return event

        if (!(await deps.events.findById(event.value.id))) {
          return err(eventError('not_found', `No existe el evento ${event.value.id}`))
        }

        // Solo estorba si el slug pertenece a OTRO evento: conservar el propio slug es
        // lo normal al editar cualquier otro campo.
        const conflicto = await deps.events.findBySlug(event.value.slug)
        if (conflicto !== null && conflicto.id !== event.value.id) {
          return err(eventError('duplicate_slug', `El slug ${event.value.slug} ya es de otro evento`))
        }

        await deps.events.update(event.value)
        return ok(event.value)
      },
      (cause) => eventError('storage_failure', `No se pudo actualizar el evento: ${String(cause)}`),
    )
