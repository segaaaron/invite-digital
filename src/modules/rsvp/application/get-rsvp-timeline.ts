import { attempt, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from '../domain/errors'
import { dailySeries, type TimelineBar } from '../domain/timeline'
import type { RsvpRepository } from './ports'

/**
 * Las respuestas de las últimas `days` jornadas, una barra por día.
 *
 * La ventana se calcula aquí y se le pasa al repositorio: traer el histórico entero para
 * quedarse con dos semanas crece con la vida del evento y no con lo que se pinta.
 */
export const getRsvpTimeline =
  (deps: { rsvp: RsvpRepository; clock: () => Date }) =>
  async (eventId: string, days: number): Promise<Result<TimelineBar[], RsvpError>> =>
    attempt<TimelineBar[], RsvpError>(
      async () => {
        const hasta = deps.clock()
        const desde = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate() - Math.max(0, days - 1))
        return ok(dailySeries(await deps.rsvp.respondedAtsFor(eventId, desde), hasta, days))
      },
      (cause) => rsvpError('storage_failure', `No se pudo leer el historial de respuestas: ${String(cause)}`),
    )
