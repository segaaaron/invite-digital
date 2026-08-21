import type { Minter } from '@/shared/security/tokens'
import { attempt, isErr, ok, type Result } from '@/shared/result'
import { createArrival } from '../domain/arrival'
import { resolveArrival } from '../domain/conflict'
import { checkinError, type CheckinError } from '../domain/errors'
import { parsePass } from '../domain/parse-pass'
import type { ArrivalRepository, DoorGroupReader, DoorGroupRow } from './ports'

export type ScanRequest = {
  readonly scanId: string
  readonly scanned: string
  readonly arrivedCount: number
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

const view = (group: DoorGroupRow): ScanGroupView => ({ id: group.id, label: group.label, seats: group.seats })

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

          const arrival = createArrival(
            {
              scanId: scan.scanId,
              guestGroupId: group.id,
              arrivedCount: scan.arrivedCount,
              scannedAt: scan.scannedAt,
              voidedAt: null,
            },
            group.seats,
          )
          if (isErr(arrival)) {
            outcomes.push({ scanId: scan.scanId, kind: 'unknown' })
            continue
          }

          const previous = (await deps.arrivals.listByEvent(input.eventId)).filter((a) => a.guestGroupId === group.id)
          const inserted = await deps.arrivals.insertIfAbsent(arrival.value)
          const resolved = resolveArrival(inserted ? [...previous, arrival.value] : previous)

          if (!inserted || previous.some((a) => a.voidedAt === null)) {
            outcomes.push(
              resolved
                ? {
                    scanId: scan.scanId,
                    kind: 'already',
                    group: view(group),
                    arrivedAt: resolved.arrivedAt,
                    arrivedCount: resolved.arrivedCount,
                  }
                : { scanId: scan.scanId, kind: 'unknown' },
            )
            continue
          }

          outcomes.push({
            scanId: scan.scanId,
            kind: 'welcome',
            group: view(group),
            arrivedCount: arrival.value.arrivedCount,
          })
        }

        return ok(outcomes)
      },
      (cause) => checkinError('storage_failure', `No se pudieron registrar los escaneos: ${String(cause)}`),
    )
