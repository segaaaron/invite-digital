import { attempt, ok, type Result } from '@/shared/result'
import { resolveArrival, type ResolvedArrival } from '../domain/conflict'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository, ArrivalRow, DoorGroupReader } from './ports'

export type DoorManifestGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly attending: number | null
  readonly revoked: boolean
  /** SHA-256 en hexadecimal. Nunca el token en claro. */
  readonly tokenHashHex: string
}

export type DoorManifest = {
  readonly eventId: string
  readonly groups: readonly DoorManifestGroup[]
  readonly arrivals: readonly ResolvedArrival[]
}

/**
 * Lo que el dispositivo de la puerta precarga para funcionar sin red. Lleva hashes, no
 * tokens: si roban el celular de la puerta, de ahí no salen enlaces utilizables.
 */
export const getDoorManifest =
  (deps: { groups: DoorGroupReader; arrivals: ArrivalRepository }) =>
  async (eventId: string): Promise<Result<DoorManifest, CheckinError>> =>
    attempt<DoorManifest, CheckinError>(
      async () => {
        const [groups, arrivals] = await Promise.all([
          deps.groups.listByEvent(eventId),
          deps.arrivals.listByEvent(eventId),
        ])

        const byGroup = new Map<string, ArrivalRow[]>()
        for (const row of arrivals) {
          byGroup.set(row.guestGroupId, [...(byGroup.get(row.guestGroupId) ?? []), row])
        }

        const resolved: ResolvedArrival[] = []
        for (const rows of byGroup.values()) {
          const one = resolveArrival(rows)
          if (one) resolved.push(one)
        }

        return ok({
          eventId,
          groups: groups.map((g) => ({
            id: g.id,
            label: g.label,
            seats: g.seats,
            attending: g.attending,
            revoked: g.revoked,
            tokenHashHex: g.tokenHash.toString('hex'),
          })),
          arrivals: resolved,
        })
      },
      (cause) => checkinError('storage_failure', `No se pudo leer el manifiesto: ${String(cause)}`),
    )
