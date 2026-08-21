import { attempt, isErr, ok, type Result } from '@/shared/result'
import type { ResolvedArrival } from '../domain/conflict'
import { doorTally, type DoorGroup, type DoorTally } from '../domain/door-tally'
import { checkinError, type CheckinError } from '../domain/errors'
import { getDoorManifest } from './get-door-manifest'
import type { ArrivalRepository, DoorGroupReader } from './ports'

export type DoorState = {
  readonly tally: DoorTally
  readonly groups: readonly DoorGroup[]
  readonly arrivals: readonly ResolvedArrival[]
}

export const getDoorState =
  (deps: { groups: DoorGroupReader; arrivals: ArrivalRepository }) =>
  async (eventId: string): Promise<Result<DoorState, CheckinError>> =>
    attempt<DoorState, CheckinError>(
      async () => {
        const manifest = await getDoorManifest(deps)(eventId)
        if (isErr(manifest)) return manifest

        const groups: DoorGroup[] = manifest.value.groups.map((g) => ({
          id: g.id,
          label: g.label,
          seats: g.seats,
          attending: g.attending,
          revoked: g.revoked,
        }))

        return ok({ tally: doorTally(groups, manifest.value.arrivals), groups, arrivals: manifest.value.arrivals })
      },
      (cause) => checkinError('storage_failure', `No se pudo leer el estado de la puerta: ${String(cause)}`),
    )
