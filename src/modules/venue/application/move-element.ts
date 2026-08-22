import { attempt, err, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from '../domain/errors'
import { clampToPlan, type VenueTable } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'
import type { VenueRepository } from './ports'

export type ElementMove = {
  readonly kind: 'table' | 'zone'
  readonly id: string
  readonly x: number
  readonly y: number
  readonly w?: number
  readonly h?: number
}

type Deps = { venue: VenueRepository }

/**
 * Guarda un lote de posiciones de una vez. El plano acumula los movimientos en local y
 * los manda al pulsar «Guardar»: escribir por fotograma de arrastre serían miles de
 * escrituras por cada mesa que alguien mueve.
 *
 * Se resuelve todo el lote antes de escribir nada. Si un elemento no es de este evento,
 * no se mueve ninguno: media colocación guardada es peor que ninguna, porque el atelier
 * no sabría qué parte quedó.
 */
export const moveElements =
  (deps: Deps) =>
  async (input: { eventId: string; moves: readonly ElementMove[] }): Promise<Result<{ moved: number }, VenueError>> =>
    attempt<{ moved: number }, VenueError>(
      async () => {
        const tables: VenueTable[] = []
        const zones: VenueZone[] = []

        for (const move of input.moves) {
          const position = { x: clampToPlan(move.x), y: clampToPlan(move.y) }

          if (move.kind === 'table') {
            const current = await deps.venue.findTable(move.id)
            if (!current) return err(venueError('not_found', `No existe la mesa ${move.id}.`))
            if (current.eventId !== input.eventId) {
              return err(venueError('wrong_event', 'Ese elemento es de otro evento.'))
            }
            tables.push({ ...current, ...position })
            continue
          }

          const current = await deps.venue.findZone(move.id)
          if (!current) return err(venueError('not_found', `No existe la zona ${move.id}.`))
          if (current.eventId !== input.eventId) {
            return err(venueError('wrong_event', 'Ese elemento es de otro evento.'))
          }
          zones.push({ ...current, ...position, w: move.w ?? current.w, h: move.h ?? current.h })
        }

        for (const table of tables) await deps.venue.updateTable(table)
        for (const zone of zones) await deps.venue.updateZone(zone)

        return ok({ moved: tables.length + zones.length })
      },
      (cause) => venueError('storage_failure', `No se pudo guardar el plano: ${String(cause)}`),
    )
