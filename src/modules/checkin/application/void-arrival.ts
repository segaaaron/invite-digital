import { attempt, err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository } from './ports'

/**
 * Deshacer no borra: escribe lápida. Queda auditoría de que alguien registró una
 * llegada y se retractó, que es lo que hace falta cuando la pareja pregunta al día
 * siguiente por qué el conteo no cuadra.
 */
export const voidArrival =
  (deps: { arrivals: ArrivalRepository; clock: () => Date }) =>
  async (input: { scanId: string }): Promise<Result<void, CheckinError>> =>
    attempt<void, CheckinError>(
      async () => {
        const row = await deps.arrivals.findByScanId(input.scanId)
        if (!row) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))

        await deps.arrivals.void(input.scanId, deps.clock())
        return ok(undefined)
      },
      (cause) => checkinError('storage_failure', `No se pudo deshacer la llegada: ${String(cause)}`),
    )
