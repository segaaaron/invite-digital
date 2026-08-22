import { attempt, ok, type Result } from '@/shared/result'
import { tallyViews, type ViewTally } from '../domain/tally'
import { analyticsError, type AnalyticsError } from '../domain/view'
import type { ViewRepository } from './ports'

/** El recuento que pinta el panel. El reloj entra por dependencia, no se lee dentro. */
export const getViewTally =
  (deps: { views: ViewRepository; clock: () => Date }) =>
  async (eventId: string): Promise<Result<ViewTally, AnalyticsError>> =>
    attempt<ViewTally, AnalyticsError>(
      async () => ok(tallyViews(await deps.views.listForEvent(eventId), deps.clock())),
      (cause) => analyticsError('storage_failure', `No se pudieron leer las visitas: ${String(cause)}`),
    )
