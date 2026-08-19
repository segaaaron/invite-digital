import { attempt, err, type Result } from '@/shared/result'
import { createEvent, type Event } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export const getEventBySlug =
  (deps: { events: EventRepository }) =>
  async (slug: string): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const row = await deps.events.findBySlug(slug)
        if (row === null) return err(eventError('not_found', `No existe el evento ${slug}`))
        return createEvent(row)
      },
      (cause) => eventError('storage_failure', `No se pudo leer el evento ${slug}: ${String(cause)}`),
    )

export const getEventById =
  (deps: { events: EventRepository }) =>
  async (id: string): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const row = await deps.events.findById(id)
        if (row === null) return err(eventError('not_found', `No existe el evento ${id}`))
        return createEvent(row)
      },
      (cause) => eventError('storage_failure', `No se pudo leer el evento ${id}: ${String(cause)}`),
    )
