import type { VenueTable } from './venue-table'

/**
 * La unidad que se sienta es el grupo, igual que la unidad que se invita. `seats` son
 * los sitios que ocupa; `tableId` es la mesa donde ya está, o `null` si no tiene.
 */
export type SeatedGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly tableId: string | null
}

export type Occupancy = { readonly taken: number; readonly free: number }

export function occupancyOf(table: Pick<VenueTable, 'id' | 'capacity'>, groups: readonly SeatedGroup[]): Occupancy {
  const taken = groups.reduce((sum, group) => (group.tableId === table.id ? sum + group.seats : sum), 0)
  // Nunca negativo: una mesa sobrecargada por una edición del cupo tiene cero libres,
  // no menos-tres, y la tarjeta no puede ofrecer sitios que no existen.
  return { taken, free: Math.max(0, table.capacity - taken) }
}

/**
 * Un grupo no se parte entre dos mesas: o cabe entero o no cabe. Si el grupo ya está
 * sentado en esta mesa no se cuenta dos veces — reasignarlo a donde ya está no puede
 * fallar por «no cabe».
 */
export function canSeat(
  table: Pick<VenueTable, 'id' | 'capacity'>,
  group: SeatedGroup,
  groups: readonly SeatedGroup[],
): boolean {
  const others = groups.filter((g) => g.id !== group.id)
  return occupancyOf(table, others).free >= group.seats
}
