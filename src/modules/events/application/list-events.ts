import { attempt, isErr, ok, type Result } from '@/shared/result'
import { createEvent, type Event } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export const listEvents =
  (deps: { events: EventRepository }) =>
  async (): Promise<Result<Event[], EventError>> =>
    attempt<Event[], EventError>(
      async () => {
        const rows = await deps.events.listAll()
        const built: Event[] = []

        for (const row of rows) {
          const event = createEvent(row)
          if (isErr(event)) return event
          built.push(event.value)
        }

        return ok(built)
      },
      (cause) => eventError('storage_failure', `No se pudo leer la lista de eventos: ${String(cause)}`),
    )
