import type { SeatedGroup } from '../domain/seating'
import type { VenueTable } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'

/**
 * El grupo tal y como lo ve el salón. `seats` son los cupos repartidos —lo que ocupa en
 * la mesa— y `confirmed` lo que el grupo respondió, que es lo que come el banquete.
 */
export type SeatedGroupRow = SeatedGroup & {
  readonly eventId: string
  readonly revoked: boolean
  readonly confirmed: number | null
}

export interface VenueRepository {
  listTables(eventId: string): Promise<VenueTable[]>
  findTable(id: string): Promise<VenueTable | null>
  insertTable(table: VenueTable): Promise<void>
  updateTable(table: VenueTable): Promise<void>
  deleteTable(id: string): Promise<void>

  listZones(eventId: string): Promise<VenueZone[]>
  findZone(id: string): Promise<VenueZone | null>
  insertZone(zone: VenueZone): Promise<void>
  updateZone(zone: VenueZone): Promise<void>
  deleteZone(id: string): Promise<void>

  listSeatedGroups(eventId: string): Promise<SeatedGroupRow[]>
  /** `null` deja al grupo sin mesa. Nunca borra el grupo. */
  setGroupTable(groupId: string, tableId: string | null): Promise<void>
}
