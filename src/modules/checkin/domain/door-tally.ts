import type { ResolvedArrival } from './conflict'

export type DoorGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  /** Cupos confirmados en la última respuesta de RSVP; `null` si no respondió. */
  readonly attending: number | null
  readonly revoked: boolean
}

export type DoorTally = {
  readonly expectedGroups: number
  readonly arrivedGroups: number
  readonly expectedHeads: number
  readonly headsInside: number
  /** Grupos que entraron sin estar entre los esperados. */
  readonly unexpectedGroups: number
}

/**
 * Esperados y llegados NO son el mismo conjunto. En una boda aparece gente que había
 * dicho que no, y su pase es válido: se registra igual. Contar los llegados filtrando
 * por confirmación deja a esa persona dentro del salón y fuera del contador, que es
 * exactamente la contradicción que se detectó en la maqueta.
 */
export function doorTally(groups: readonly DoorGroup[], resolved: readonly ResolvedArrival[]): DoorTally {
  const expected = groups.filter((g) => !g.revoked)
  const expectedIds = new Set(expected.map((g) => g.id))

  return {
    expectedGroups: expected.length,
    expectedHeads: expected.reduce((sum, g) => sum + (g.attending ?? 0), 0),
    arrivedGroups: resolved.length,
    headsInside: resolved.reduce((sum, a) => sum + a.arrivedCount, 0),
    unexpectedGroups: resolved.filter((a) => !expectedIds.has(a.guestGroupId)).length,
  }
}
