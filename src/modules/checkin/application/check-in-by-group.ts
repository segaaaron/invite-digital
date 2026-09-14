import { attempt, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ScanOutcome } from './check-in-by-scan'
import type { ArrivalRepository, DoorGroupReader } from './ports'
import { registerArrival } from './register-arrival'

export type GroupScanRequest = {
  readonly scanId: string
  readonly groupId: string
  readonly arrivedCount: number | null
  readonly scannedAt: Date
}

/**
 * El camino del buscador por nombre: quien llega sin pase legible se registra eligiendo
 * su grupo. Salta `parsePass` —no hay nada que escanear— pero repite la comprobación de
 * que el grupo pertenece a este evento, que es lo que impide que un id copiado de otra
 * boda de la plataforma abra esta puerta.
 */
export const checkInByGroup =
  (deps: { groups: DoorGroupReader; arrivals: ArrivalRepository }) =>
  async (input: { eventId: string; scan: GroupScanRequest; recordedBy?: string | null }): Promise<Result<ScanOutcome, CheckinError>> =>
    attempt<ScanOutcome, CheckinError>(
      async () => {
        const group = await deps.groups.findGroupById(input.scan.groupId)
        if (!group || group.eventId !== input.eventId) {
          return ok({ scanId: input.scan.scanId, kind: 'unknown' } as const)
        }

        return ok(await registerArrival(deps.arrivals, input.eventId, group, input.scan, input.recordedBy ?? null))
      },
      (cause) => checkinError('storage_failure', `No se pudo registrar la llegada: ${String(cause)}`),
    )
