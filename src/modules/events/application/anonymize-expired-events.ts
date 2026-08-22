import { attempt, ok, type Result } from '@/shared/result'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export type MaintenanceReport = {
  readonly eventsAnonymized: readonly string[]
  readonly sessionsDeleted: number
  readonly viewsDeleted: number
}

/**
 * Los invitados no son clientes del atelier y no aceptaron ningún término: pasado el
 * plazo de retención se conserva el agregado —cupos y asistentes— y se borra lo que
 * identifica: la etiqueta del grupo y el mensaje.
 *
 * Se aprovecha el mismo pase para barrer sesiones caducadas, que es la otra tabla que
 * crece sola.
 */
export const anonymizeExpiredEvents =
  (deps: {
    events: EventRepository
    deleteExpiredSessions: (now: Date) => Promise<number>
    /**
     * Las visitas de un evento vencido se **borran**, no se anonimizan: no identifican a
     * nadie, pero sin el evento no sirven de nada y son la tabla que más crece.
     */
    deleteViewsForEvent: (eventId: string) => Promise<number>
    clock: () => Date
  }) =>
  async (): Promise<Result<MaintenanceReport, EventError>> =>
    attempt<MaintenanceReport, EventError>(
      async () => {
        const now = deps.clock()
        const pending = await deps.events.listPendingAnonymization(now)

        const anonymized: string[] = []
        let viewsDeleted = 0
        for (const event of pending) {
          await deps.events.anonymize(event.id, now)
          viewsDeleted += await deps.deleteViewsForEvent(event.id)
          anonymized.push(event.slug)
        }

        return ok({
          eventsAnonymized: anonymized,
          sessionsDeleted: await deps.deleteExpiredSessions(now),
          viewsDeleted,
        })
      },
      (cause) => eventError('storage_failure', `Falló el mantenimiento: ${String(cause)}`),
    )
