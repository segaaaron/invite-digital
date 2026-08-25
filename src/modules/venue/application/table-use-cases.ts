import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from '../domain/errors'
import { freeSpot } from '../domain/free-spot'
import { createVenueTable, type TableShape, type VenueTable } from '../domain/venue-table'
import type { VenueRepository } from './ports'

type Deps = { venue: VenueRepository }
type WithIds = Deps & { ids: () => string }

export type AddTableInput = {
  eventId: string
  label: string
  capacity: number
  shape: TableShape
  x?: number
  y?: number
}

export type UpdateTableInput = {
  id: string
  eventId: string
  label: string
  capacity: number
  shape: TableShape
}

/**
 * La etiqueta se compara ya recortada y sin distinguir mayúsculas, igual que la lee un
 * humano: «Mesa 01» y «mesa 01 » son la misma mesa para quien reparte los sitios. El
 * índice único de la base es la última palabra, pero llegar hasta él para enterarse
 * devolvería una excepción de Postgres en lugar de un mensaje en el formulario.
 */
const clashes = (tables: readonly VenueTable[], label: string, exceptId?: string): boolean =>
  tables.some((t) => t.id !== exceptId && t.label.trim().toLocaleLowerCase() === label.trim().toLocaleLowerCase())

export const addTable =
  (deps: WithIds) =>
  async (input: AddTableInput): Promise<Result<VenueTable, VenueError>> =>
    attempt<VenueTable, VenueError>(
      async () => {
        // Las mesas y las zonas que ya están puestas, para no nacer encima de ninguna.
        const existing = await deps.venue.listTables(input.eventId)
        const zonas = await deps.venue.listZones(input.eventId)
        const sitio = freeSpot([...existing, ...zonas])

        const table = createVenueTable({
          id: deps.ids(),
          eventId: input.eventId,
          label: input.label,
          capacity: input.capacity,
          shape: input.shape,
          x: input.x ?? sitio.x,
          y: input.y ?? sitio.y,
        })
        if (isErr(table)) return table

        if (clashes(existing, table.value.label)) {
          return err(venueError('duplicate_label', `Ya hay una «${table.value.label}» en este evento.`))
        }

        await deps.venue.insertTable(table.value)
        return ok(table.value)
      },
      (cause) => venueError('storage_failure', `No se pudo crear la mesa: ${String(cause)}`),
    )

export const updateTable =
  (deps: Deps) =>
  async (input: UpdateTableInput): Promise<Result<VenueTable, VenueError>> =>
    attempt<VenueTable, VenueError>(
      async () => {
        const current = await deps.venue.findTable(input.id)
        if (!current) return err(venueError('not_found', `No existe la mesa ${input.id}.`))
        // La comprobación de evento vive en el servidor: la UI puede mentir, un id
        // copiado de otro salón no puede editar esta mesa.
        if (current.eventId !== input.eventId) {
          return err(venueError('wrong_event', 'Esa mesa es de otro evento.'))
        }

        const table = createVenueTable({
          id: current.id,
          eventId: current.eventId,
          label: input.label,
          capacity: input.capacity,
          shape: input.shape,
          x: current.x,
          y: current.y,
        })
        if (isErr(table)) return table

        const existing = await deps.venue.listTables(input.eventId)
        if (clashes(existing, table.value.label, current.id)) {
          return err(venueError('duplicate_label', `Ya hay una «${table.value.label}» en este evento.`))
        }

        await deps.venue.updateTable(table.value)
        return ok(table.value)
      },
      (cause) => venueError('storage_failure', `No se pudo editar la mesa: ${String(cause)}`),
    )

/**
 * Borrar una mesa deja a sus grupos sin mesa; no los borra. Devuelve cuántos quedaron
 * sueltos para que el atelier lo lea en pantalla en vez de descubrirlo el día del
 * evento con gente de pie.
 */
export const removeTable =
  (deps: Deps) =>
  async (input: { id: string; eventId: string }): Promise<Result<{ orphaned: number }, VenueError>> =>
    attempt<{ orphaned: number }, VenueError>(
      async () => {
        const current = await deps.venue.findTable(input.id)
        if (!current) return err(venueError('not_found', `No existe la mesa ${input.id}.`))
        if (current.eventId !== input.eventId) {
          return err(venueError('wrong_event', 'Esa mesa es de otro evento.'))
        }

        const groups = await deps.venue.listSeatedGroups(input.eventId)
        const orphaned = groups.filter((g) => g.tableId === input.id).length

        await deps.venue.deleteTable(input.id)
        return ok({ orphaned })
      },
      (cause) => venueError('storage_failure', `No se pudo borrar la mesa: ${String(cause)}`),
    )
