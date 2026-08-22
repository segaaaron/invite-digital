import { attempt, err, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from '../domain/errors'
import { autoAssign, occupancyOf, type SeatedGroup } from '../domain/seating'
import type { VenueRepository } from './ports'

type Deps = { venue: VenueRepository }

export type AutoAssignSummary = {
  readonly assigned: number
  readonly unplaced: readonly SeatedGroup[]
}

export const assignGroup =
  (deps: Deps) =>
  async (input: { eventId: string; groupId: string; tableId: string }): Promise<Result<void, VenueError>> =>
    attempt<void, VenueError>(
      async () => {
        const table = await deps.venue.findTable(input.tableId)
        if (!table) return err(venueError('not_found', `No existe la mesa ${input.tableId}.`))
        // Mesa y grupo del mismo evento. Va aquí, en el servidor: la UI solo ofrece las
        // mesas de este salón, pero una acción es un extremo HTTP público.
        if (table.eventId !== input.eventId) return err(venueError('wrong_event', 'Esa mesa es de otro evento.'))

        const groups = await deps.venue.listSeatedGroups(input.eventId)
        const group = groups.find((g) => g.id === input.groupId)
        if (!group) return err(venueError('wrong_event', 'Ese grupo no es de este evento.'))

        // El propio grupo no cuenta contra el sitio libre: reasignarlo a la mesa donde
        // ya está no puede fallar por «no cabe».
        const otros = groups.filter((g) => g.id !== group.id)
        const { free } = occupancyOf(table, otros)
        if (free < group.seats) {
          return err(
            venueError(
              'does_not_fit',
              `«${group.label}» necesita ${group.seats} sitios y en «${table.label}» quedan ${free}: faltan ${group.seats - free}. Un grupo no se parte entre dos mesas.`,
            ),
          )
        }

        await deps.venue.setGroupTable(group.id, table.id)
        return ok(undefined)
      },
      (cause) => venueError('storage_failure', `No se pudo sentar al grupo: ${String(cause)}`),
    )

export const unassignGroup =
  (deps: Deps) =>
  async (input: { eventId: string; groupId: string }): Promise<Result<void, VenueError>> =>
    attempt<void, VenueError>(
      async () => {
        const groups = await deps.venue.listSeatedGroups(input.eventId)
        if (!groups.some((g) => g.id === input.groupId)) {
          return err(venueError('wrong_event', 'Ese grupo no es de este evento.'))
        }

        await deps.venue.setGroupTable(input.groupId, null)
        return ok(undefined)
      },
      (cause) => venueError('storage_failure', `No se pudo quitar la mesa al grupo: ${String(cause)}`),
    )

/**
 * Reparte lo que falta. El algoritmo es puro y vive en el dominio; aquí solo se leen los
 * datos, se persisten las asignaciones nuevas —una escritura por grupo que se coloca, no
 * una por grupo del evento— y se informa de quién quedó fuera.
 */
export const autoAssignGroups =
  (deps: Deps) =>
  async (input: { eventId: string }): Promise<Result<AutoAssignSummary, VenueError>> =>
    attempt<AutoAssignSummary, VenueError>(
      async () => {
        const [tables, rows] = await Promise.all([
          deps.venue.listTables(input.eventId),
          deps.venue.listSeatedGroups(input.eventId),
        ])

        // Un grupo revocado ya no está invitado: no ocupa sitio ni sale como pendiente.
        const groups = rows.filter((g) => !g.revoked)
        const { assignments, unplaced } = autoAssign(tables, groups)

        for (const a of assignments) await deps.venue.setGroupTable(a.groupId, a.tableId)

        return ok({ assigned: assignments.length, unplaced })
      },
      (cause) => venueError('storage_failure', `No se pudo repartir a los invitados: ${String(cause)}`),
    )
