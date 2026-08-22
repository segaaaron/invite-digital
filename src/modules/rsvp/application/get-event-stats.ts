import { attempt, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from '../domain/errors'
import { eventStatsOf, type EventStats } from '../domain/stats'
import type { RsvpRepository } from './ports'

/**
 * Las estadísticas del evento salen de las **mismas filas** que el contador de la
 * página: una sola lectura, sin ninguna columna nueva. Que no haya que medir nada más
 * es el motivo de que esta vista se pueda construir hoy sin inventarse datos.
 */
export const getEventStats =
  (deps: { rsvp: RsvpRepository }) =>
  async (eventId: string): Promise<Result<EventStats, RsvpError>> =>
    attempt<EventStats, RsvpError>(
      async () => ok(eventStatsOf(await deps.rsvp.tallyRowsFor(eventId))),
      (cause) => rsvpError('storage_failure', `No se pudieron leer las estadísticas del evento: ${String(cause)}`),
    )
