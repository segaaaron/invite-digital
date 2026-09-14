import { isErr } from '@/shared/result'
import { createArrival } from '../domain/arrival'
import { resolveArrival } from '../domain/conflict'
import type { ScanGroupView, ScanOutcome } from './check-in-by-scan'
import type { ArrivalRepository, DoorGroupRow } from './ports'

const groupView = (group: DoorGroupRow): ScanGroupView => ({
  id: group.id,
  label: group.label,
  leadName: group.leadName,
  seats: group.seats,
  tableLabel: group.tableLabel,
})

/**
 * El tramo común a los dos caminos de registro: el pase escaneado y el grupo elegido a
 * mano en el buscador. Ambos llegan aquí con el grupo ya resuelto y ya comprobado que
 * pertenece a este evento; lo que sigue —cupos, idempotencia y conflicto— es idéntico,
 * y duplicarlo era la vía rápida a que un camino olvidara una regla que el otro cumple.
 *
 * `arrivedCount` nulo significa «decide tú»: el cliente no sabe cuántos confirmó el
 * grupo hasta que el servidor se lo dice, y adivinarlo en el navegador fue justo el
 * defecto que se corrigió aquí.
 */
export async function registerArrival(
  arrivals: ArrivalRepository,
  eventId: string,
  group: DoorGroupRow,
  scan: { scanId: string; arrivedCount: number | null; scannedAt: Date },
  recordedBy: string | null = null,
): Promise<ScanOutcome> {
  const arrival = createArrival(
    {
      scanId: scan.scanId,
      guestGroupId: group.id,
      arrivedCount: scan.arrivedCount ?? group.attending ?? 1,
      scannedAt: scan.scannedAt,
      voidedAt: null,
    },
    group.seats,
  )
  if (isErr(arrival)) return { scanId: scan.scanId, kind: 'unknown' }

  const previous = (await arrivals.listByEvent(eventId)).filter((a) => a.guestGroupId === group.id)
  const inserted = await arrivals.insertIfAbsent({ ...arrival.value, recordedBy })
  const resolved = resolveArrival(inserted ? [...previous, arrival.value] : previous)

  if (!inserted || previous.some((a) => a.voidedAt === null)) {
    return resolved
      ? {
          scanId: scan.scanId,
          kind: 'already',
          group: groupView(group),
          arrivedAt: resolved.arrivedAt,
          arrivedCount: resolved.arrivedCount,
        }
      : { scanId: scan.scanId, kind: 'unknown' }
  }

  return {
    scanId: scan.scanId,
    kind: 'welcome',
    group: groupView(group),
    arrivedCount: arrival.value.arrivedCount,
  }
}
