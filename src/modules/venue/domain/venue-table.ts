import { err, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from './errors'

export const TABLE_SHAPES = ['round', 'rect', 'sweetheart', 'imperial'] as const
export type TableShape = (typeof TABLE_SHAPES)[number]

export type VenueTable = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly capacity: number
  readonly shape: TableShape
  /** Porcentaje del ancho del plano, 0..100. */
  readonly x: number
  /** Porcentaje del alto del plano, 0..100. */
  readonly y: number
}

export type VenueTableInput = {
  id: string
  eventId: string
  label: string
  capacity: number
  shape: TableShape
  x: number
  y: number
}

/**
 * Recorta al plano en vez de rechazar. Arrastrar una mesa un poco más allá del borde es
 * un gesto normal de quien coloca el salón, no un error que merezca un mensaje rojo.
 */
export const clampToPlan = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function createVenueTable(input: VenueTableInput): Result<VenueTable, VenueError> {
  const label = input.label.trim()
  if (label.length === 0) {
    return err(venueError('invalid_label', 'La mesa necesita una etiqueta: la puerta la canta en voz alta.'))
  }

  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    return err(venueError('invalid_capacity', `Cupo inválido: ${input.capacity}. Una mesa sin sitios no es una mesa.`))
  }

  return ok({
    id: input.id,
    eventId: input.eventId,
    label,
    capacity: input.capacity,
    shape: input.shape,
    x: clampToPlan(input.x),
    y: clampToPlan(input.y),
  })
}
