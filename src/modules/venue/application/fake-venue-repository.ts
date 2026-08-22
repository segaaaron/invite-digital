import type { SeatedGroupRow, VenueRepository } from './ports'
import type { VenueTable } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'

export type FakeVenue = {
  repo: VenueRepository
  tables: VenueTable[]
  zones: VenueZone[]
  groups: SeatedGroupRow[]
}

/**
 * Repositorio en memoria con el mismo contrato que el de Postgres, incluido el índice
 * único de etiqueta por evento: si el falso lo dejara pasar, las pruebas de aplicación
 * describirían un mundo que la base no acepta.
 */
export const fakeVenueRepository = (initial: {
  tables?: VenueTable[]
  zones?: VenueZone[]
  groups?: SeatedGroupRow[]
}): FakeVenue => {
  const tables = [...(initial.tables ?? [])]
  const zones = [...(initial.zones ?? [])]
  const groups = [...(initial.groups ?? [])]

  const repo: VenueRepository = {
    async listTables(eventId) {
      return tables.filter((t) => t.eventId === eventId)
    },
    async findTable(id) {
      return tables.find((t) => t.id === id) ?? null
    },
    async insertTable(table) {
      if (tables.some((t) => t.eventId === table.eventId && t.label === table.label)) {
        throw new Error('duplicate key value violates unique constraint "venue_tables_label_unique"')
      }
      tables.push(table)
    },
    async updateTable(table) {
      const i = tables.findIndex((t) => t.id === table.id)
      if (i >= 0) tables[i] = table
    },
    async deleteTable(id) {
      const i = tables.findIndex((t) => t.id === id)
      if (i >= 0) tables.splice(i, 1)
      // El equivalente del ON DELETE SET NULL: el grupo sobrevive sin mesa.
      for (let k = 0; k < groups.length; k += 1) {
        const group = groups[k]
        if (group && group.tableId === id) groups[k] = { ...group, tableId: null }
      }
    },

    async listZones(eventId) {
      return zones.filter((z) => z.eventId === eventId)
    },
    async findZone(id) {
      return zones.find((z) => z.id === id) ?? null
    },
    async insertZone(zone) {
      zones.push(zone)
    },
    async updateZone(zone) {
      const i = zones.findIndex((z) => z.id === zone.id)
      if (i >= 0) zones[i] = zone
    },
    async deleteZone(id) {
      const i = zones.findIndex((z) => z.id === id)
      if (i >= 0) zones.splice(i, 1)
    },

    async listSeatedGroups(eventId) {
      return groups.filter((g) => g.eventId === eventId).map((g) => ({ ...g }))
    },
    async setGroupTable(groupId, tableId) {
      const i = groups.findIndex((g) => g.id === groupId)
      const group = groups[i]
      if (group) groups[i] = { ...group, tableId }
    },
  }

  return { repo, tables, zones, groups }
}
