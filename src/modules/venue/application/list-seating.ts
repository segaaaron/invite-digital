import { attempt, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from '../domain/errors'
import { occupancyOf } from '../domain/seating'
import type { VenueTable } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'
import type { SeatedGroupRow, VenueRepository } from './ports'

export type SeatedTable = VenueTable & {
  readonly taken: number
  readonly free: number
  readonly groups: readonly SeatedGroupRow[]
}

export type SeatingView = {
  readonly tables: readonly SeatedTable[]
  readonly zones: readonly VenueZone[]
  readonly unseated: readonly SeatedGroupRow[]
  readonly totalSeats: number
  /** Comensales que el banquete tiene que dar de comer: lo confirmado, no lo repartido. */
  readonly totalConfirmed: number
}

/**
 * Todo lo que el plano y el plan del banquete necesitan, en una lectura. Las mesas van
 * ordenadas por etiqueta porque así se lee el papel del día del evento.
 */
export const listSeating =
  (deps: { venue: VenueRepository }) =>
  async (eventId: string): Promise<Result<SeatingView, VenueError>> =>
    attempt<SeatingView, VenueError>(
      async () => {
        const [tables, zones, rows] = await Promise.all([
          deps.venue.listTables(eventId),
          deps.venue.listZones(eventId),
          deps.venue.listSeatedGroups(eventId),
        ])

        // Un grupo revocado ya no está invitado: ni ocupa sitio, ni queda pendiente de
        // sentar, ni come.
        const groups = rows.filter((g) => !g.revoked)

        return ok({
          tables: [...tables]
            .sort((a, b) => a.label.localeCompare(b.label, 'es'))
            .map((table) => ({
              ...table,
              ...occupancyOf(table, groups),
              groups: groups.filter((g) => g.tableId === table.id),
            })),
          zones,
          unseated: groups.filter((g) => g.tableId === null),
          totalSeats: tables.reduce((sum, t) => sum + t.capacity, 0),
          totalConfirmed: groups.reduce((sum, g) => sum + (g.confirmed ?? 0), 0),
        })
      },
      (cause) => venueError('storage_failure', `No se pudo leer el plano del salón: ${String(cause)}`),
    )
