import { attempt, isErr, ok, type Result } from '@/shared/result'
import { analyticsError, createView, type AnalyticsError } from '../domain/view'
import type { ViewRepository } from './ports'

/**
 * Registra una visita. La categoría llega ya resuelta desde la frontera: el dominio no
 * sabe nada de cabeceras HTTP.
 */
export const recordView =
  (deps: { views: ViewRepository }) =>
  async (input: {
    eventId: string
    guestGroupId: string | null
    device: string
    source: string
    viewedAt: Date
  }): Promise<Result<null, AnalyticsError>> =>
    attempt<null, AnalyticsError>(
      async () => {
        const vista = createView(input)
        if (isErr(vista)) return vista

        await deps.views.record(vista.value)
        return ok(null)
      },
      (cause) => analyticsError('storage_failure', `No se pudo registrar la visita: ${String(cause)}`),
    )
