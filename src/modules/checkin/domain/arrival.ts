import { err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from './errors'

export type Arrival = {
  readonly scanId: string
  readonly guestGroupId: string
  readonly arrivedCount: number
  readonly scannedAt: Date
  readonly voidedAt: Date | null
}

export type ArrivalInput = {
  scanId: string
  guestGroupId: string
  arrivedCount: number
  scannedAt: Date
  voidedAt: Date | null
}

/**
 * El límite superior son los cupos del grupo, que viven en otra tabla y no caben en una
 * restricción de columna: se impone aquí, antes de llegar a la base.
 */
export function createArrival(input: ArrivalInput, seats: number): Result<Arrival, CheckinError> {
  const { arrivedCount } = input
  if (!Number.isInteger(arrivedCount) || arrivedCount < 1) {
    return err(
      checkinError('invalid_count', `Cantidad inválida: ${arrivedCount}. Un grupo que no entró no se registra.`),
    )
  }
  if (arrivedCount > seats) {
    return err(checkinError('invalid_count', `Llegaron ${arrivedCount} y el grupo tiene ${seats} cupos.`))
  }

  return ok({
    scanId: input.scanId,
    guestGroupId: input.guestGroupId,
    arrivedCount,
    scannedAt: input.scannedAt,
    voidedAt: input.voidedAt,
  })
}

export const isLive = (arrival: Arrival): boolean => arrival.voidedAt === null
