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
  people: group.people,
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
 *
 * **Con personas**, el escaneo dice quiénes entran. Solo cuentan las de esta invitación y
 * que aún no estaban dentro: quien ya entró no se registra dos veces, y una persona de otra
 * invitación no se cuela en esta. Si no queda nadie nuevo, no se escribe nada.
 */
export async function registerArrival(
  arrivals: ArrivalRepository,
  eventId: string,
  group: DoorGroupRow,
  scan: { scanId: string; arrivedCount: number | null; scannedAt: Date; personIds?: readonly string[] | null },
  recordedBy: string | null = null,
): Promise<ScanOutcome> {
  const previous = (await arrivals.listByEvent(eventId)).filter((a) => a.guestGroupId === group.id)
  const antes = resolveArrival(previous)

  let personIds: string[] | null = null
  if (group.people.length > 0) {
    const suyas = new Set(group.people.map((p) => p.id))
    // Sin nombres —el buscador del panel, una puerta con la versión anterior— entran todos los
    // que faltaban: así la invitación con personas nunca queda contada por número y sin nombres.
    const pedidas = scan.personIds === undefined || scan.personIds === null ? [...suyas] : scan.personIds
    personIds = [...new Set(pedidas)].filter((id) => suyas.has(id) && antes?.personas[id] === undefined)
    if (personIds.length === 0) {
      return antes === null
        ? { scanId: scan.scanId, kind: 'unknown' }
        : { scanId: scan.scanId, kind: 'already', group: groupView(group), arrivedAt: antes.arrivedAt, arrivedCount: antes.arrivedCount, personas: antes.personas }
    }
  }

  const arrival = createArrival(
    {
      scanId: scan.scanId,
      guestGroupId: group.id,
      arrivedCount: personIds === null ? (scan.arrivedCount ?? group.attending ?? 1) : personIds.length,
      scannedAt: scan.scannedAt,
      voidedAt: null,
      personIds,
    },
    group.seats,
  )
  if (isErr(arrival)) return { scanId: scan.scanId, kind: 'unknown' }

  const inserted = await arrivals.insertIfAbsent({ ...arrival.value, recordedBy })
  const resolved = resolveArrival(inserted ? [...previous, arrival.value] : previous)

  if (!inserted || (personIds === null && previous.some((a) => a.voidedAt === null))) {
    return resolved
      ? {
          scanId: scan.scanId,
          kind: 'already',
          group: groupView(group),
          arrivedAt: resolved.arrivedAt,
          arrivedCount: resolved.arrivedCount,
          personas: resolved.personas,
        }
      : { scanId: scan.scanId, kind: 'unknown' }
  }

  return {
    scanId: scan.scanId,
    kind: 'welcome',
    group: groupView(group),
    // Por persona, cuántos hay ya dentro de la invitación; por número, lo de este escaneo.
    arrivedCount: personIds === null ? arrival.value.arrivedCount : (resolved?.arrivedCount ?? personIds.length),
    personas: resolved?.personas ?? {},
  }
}
