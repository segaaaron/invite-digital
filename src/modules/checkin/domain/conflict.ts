import { isLive, type Arrival } from './arrival'

export type ResolvedArrival = {
  readonly guestGroupId: string
  readonly arrivedAt: Date
  readonly arrivedCount: number
  /** Escaneos vivos del grupo. Más de uno significa dos puertas o un reenvío doble. */
  readonly scanCount: number
}

/**
 * Un grupo puede tener varias filas: dos puertas sin red, o un reintento que llegó por
 * caminos distintos. La regla que hace que sincronizar tarde no reescriba la historia:
 * la hora la fija el escaneo más temprano —es cuando cruzaron la puerta— y la cantidad
 * la fija el más reciente, que es la última corrección que hizo un humano.
 */
export function resolveArrival(arrivals: readonly Arrival[]): ResolvedArrival | null {
  const live = arrivals.filter(isLive)
  const first = live[0]
  if (!first) return null

  let earliest = first
  let latest = first
  for (const arrival of live) {
    if (arrival.scannedAt < earliest.scannedAt) earliest = arrival
    if (arrival.scannedAt > latest.scannedAt) latest = arrival
  }

  return {
    guestGroupId: first.guestGroupId,
    arrivedAt: earliest.scannedAt,
    arrivedCount: latest.arrivedCount,
    scanCount: live.length,
  }
}
