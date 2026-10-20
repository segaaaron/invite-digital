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

/**
 * Las demos, para la pantalla del admin. Misma construcción que la cartera y consulta aparte: lo que las
 * separa es `listAll`, que ya no las trae.
 */
export const listDemos =
  (deps: { events: EventRepository; avisar: (mensaje: string, ...datos: unknown[]) => void }) =>
  async (): Promise<Result<Event[], EventError>> =>
    attempt<Event[], EventError>(
      async () => {
        const built: Event[] = []
        for (const row of await deps.events.listDemos()) {
          const event = createEvent(row)
          if (isErr(event)) {
            // **Una fila mala no ciega la pantalla.** Devolver el error dejaba al admin leyendo «la base
            // no responde» con la base perfecta, por una sola demo con un dato raro. Se cuenta y se sigue.
            deps.avisar('no se pudo leer una demo de la lista', event.error.kind, event.error.detail)
            continue
          }
          built.push(event.value)
        }
        return ok(built)
      },
      (cause) => eventError('storage_failure', `No se pudo leer la lista de demos: ${String(cause)}`),
    )
