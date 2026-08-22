import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from '../domain/errors'
import { createVenueZone, type VenueZone, type ZoneKind } from '../domain/venue-zone'
import type { VenueRepository } from './ports'

type Deps = { venue: VenueRepository }
type WithIds = Deps & { ids: () => string }

export type ZoneInput = {
  eventId: string
  kind: ZoneKind
  label: string
  x: number
  y: number
  w: number
  h: number
}

export const addZone =
  (deps: WithIds) =>
  async (input: ZoneInput): Promise<Result<VenueZone, VenueError>> =>
    attempt<VenueZone, VenueError>(
      async () => {
        const zone = createVenueZone({ ...input, id: deps.ids() })
        if (isErr(zone)) return zone

        await deps.venue.insertZone(zone.value)
        return ok(zone.value)
      },
      (cause) => venueError('storage_failure', `No se pudo crear la zona: ${String(cause)}`),
    )

/**
 * Las zonas no tienen etiqueta única: dos barras en un salón grande son normales, y la
 * puerta no canta el nombre de una zona en voz alta como hace con el de una mesa.
 */
export const updateZone =
  (deps: Deps) =>
  async (input: ZoneInput & { id: string }): Promise<Result<VenueZone, VenueError>> =>
    attempt<VenueZone, VenueError>(
      async () => {
        const current = await deps.venue.findZone(input.id)
        if (!current) return err(venueError('not_found', `No existe la zona ${input.id}.`))
        if (current.eventId !== input.eventId) return err(venueError('wrong_event', 'Esa zona es de otro evento.'))

        const zone = createVenueZone({ ...input, id: current.id, eventId: current.eventId })
        if (isErr(zone)) return zone

        await deps.venue.updateZone(zone.value)
        return ok(zone.value)
      },
      (cause) => venueError('storage_failure', `No se pudo editar la zona: ${String(cause)}`),
    )

export const removeZone =
  (deps: Deps) =>
  async (input: { id: string; eventId: string }): Promise<Result<void, VenueError>> =>
    attempt<void, VenueError>(
      async () => {
        const current = await deps.venue.findZone(input.id)
        if (!current) return err(venueError('not_found', `No existe la zona ${input.id}.`))
        if (current.eventId !== input.eventId) return err(venueError('wrong_event', 'Esa zona es de otro evento.'))

        await deps.venue.deleteZone(input.id)
        return ok(undefined)
      },
      (cause) => venueError('storage_failure', `No se pudo borrar la zona: ${String(cause)}`),
    )
