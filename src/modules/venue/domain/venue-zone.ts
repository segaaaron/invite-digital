import { err, ok, type Result } from '@/shared/result'
import { venueError, type VenueError } from './errors'
import { clampToPlan } from './venue-table'

export const ZONE_KINDS = ['dance', 'bar', 'stage', 'music', 'entrance'] as const
export type ZoneKind = (typeof ZONE_KINDS)[number]

export type VenueZone = {
  readonly id: string
  readonly eventId: string
  readonly kind: ZoneKind
  readonly label: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export type VenueZoneInput = {
  id: string
  eventId: string
  kind: ZoneKind
  label: string
  x: number
  y: number
  w: number
  h: number
}

const isZoneKind = (value: string): value is ZoneKind => (ZONE_KINDS as readonly string[]).includes(value)

/**
 * El tamaño no se recorta contra el borde: una zona puede sobresalir del plano y el
 * atelier lo corrige arrastrando. Lo que sí se rechaza es un ancho o alto de cero, que
 * dibujaría una zona invisible e inseleccionable.
 */
export function createVenueZone(input: VenueZoneInput): Result<VenueZone, VenueError> {
  if (!isZoneKind(input.kind)) {
    return err(venueError('invalid_kind', `El plano no sabe dibujar una zona de clase «${input.kind}».`))
  }

  const label = input.label.trim()
  if (label.length === 0) {
    return err(venueError('invalid_label', 'La zona necesita una etiqueta para reconocerla en el plano.'))
  }

  if (!(input.w > 0) || !(input.h > 0)) {
    return err(
      venueError('invalid_size', `Tamaño inválido: ${input.w} × ${input.h}. Una zona sin superficie no se ve ni se toca.`),
    )
  }

  return ok({
    id: input.id,
    eventId: input.eventId,
    kind: input.kind,
    label,
    x: clampToPlan(input.x),
    y: clampToPlan(input.y),
    w: input.w,
    h: input.h,
  })
}
