import type { Minter } from '@/shared/security/tokens'
import { attempt, isErr, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import { parsePass } from '../domain/parse-pass'
import type { ArrivalRepository, DoorGroupReader } from './ports'
import { registerArrival } from './register-arrival'

export type ScanRequest = {
  readonly scanId: string
  readonly scanned: string
  /** `null` deja la cantidad en manos del servidor: la fija lo confirmado por el grupo. */
  readonly arrivedCount: number | null
  readonly scannedAt: Date
}

export type ScanGroupView = { readonly id: string; readonly label: string; readonly seats: number }

export type ScanOutcome =
  | { readonly scanId: string; readonly kind: 'welcome'; readonly group: ScanGroupView; readonly arrivedCount: number }
  | {
      readonly scanId: string
      readonly kind: 'already'
      readonly group: ScanGroupView
      readonly arrivedAt: Date
      readonly arrivedCount: number
    }
  | { readonly scanId: string; readonly kind: 'unknown' }

type Deps = { groups: DoorGroupReader; arrivals: ArrivalRepository; minter: Minter }

/**
 * Recibe un lote desde el principio. Un escaneo en línea es un lote de uno; la bandeja
 * de salida manda lo acumulado tras un corte de red. Cada escaneo se resuelve por
 * separado: que uno venga corrupto no puede tumbar los demás.
 */
export const checkInByScan =
  (deps: Deps) =>
  async (input: { eventId: string; scans: readonly ScanRequest[] }): Promise<Result<ScanOutcome[], CheckinError>> =>
    attempt<ScanOutcome[], CheckinError>(
      async () => {
        const outcomes: ScanOutcome[] = []

        for (const scan of input.scans) {
          const token = parsePass(scan.scanned)
          if (isErr(token)) {
            outcomes.push({ scanId: scan.scanId, kind: 'unknown' })
            continue
          }

          const group = await deps.groups.findByTokenHash(deps.minter.hashOf(token.value))
          // El manifiesto del dispositivo es una caché, no una autoridad: aquí se vuelve
          // a comprobar que el grupo pertenece al evento de esta puerta. Sin esto, el
          // pase de otra boda de la misma plataforma abriría esta.
          if (!group || group.eventId !== input.eventId) {
            outcomes.push({ scanId: scan.scanId, kind: 'unknown' })
            continue
          }

          outcomes.push(await registerArrival(deps.arrivals, input.eventId, group, scan))
        }

        return ok(outcomes)
      },
      (cause) => checkinError('storage_failure', `No se pudieron registrar los escaneos: ${String(cause)}`),
    )
