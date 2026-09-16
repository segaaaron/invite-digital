import { err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from './errors'

export type Arrival = {
  readonly scanId: string
  readonly guestGroupId: string
  readonly arrivedCount: number
  readonly scannedAt: Date
  readonly voidedAt: Date | null
  /**
   * Quiénes entraron **en este escaneo**, cuando la invitación tiene personas cargadas.
   * Ausente o nulo es un escaneo por número: las invitaciones sin nombres y las llegadas
   * anteriores a que la puerta registrara personas.
   */
  readonly personIds?: readonly string[] | null
}

export type ArrivalInput = {
  scanId: string
  guestGroupId: string
  arrivedCount: number
  scannedAt: Date
  voidedAt: Date | null
  personIds?: readonly string[] | null
}

/**
 * Cuántos pueden entrar de más sobre los cupos del grupo.
 *
 * **No es cero, y tampoco es infinito.** En una boda aparecen acompañantes que nadie
 * anotó: negarlo dejaría al catering contando mal. Pero un tope alto convierte un dedo
 * torpe en cuatrocientos comensales, así que se permite lo que cabe en una familia que
 * se trae a alguien, no una lista paralela.
 */
export const MAX_EXTRA_ARRIVALS = 10

/** Cuántos de los que entraron no estaban invitados. Se deriva; no se guarda. */
export const unlistedOf = (arrival: Arrival, seats: number): number => Math.max(0, arrival.arrivedCount - seats)

/**
 * El límite superior son los cupos del grupo más el margen de acompañantes no anotados.
 * Viven en otra tabla y no caben en una restricción de columna: se impone aquí, antes de
 * llegar a la base.
 */
export function createArrival(input: ArrivalInput, seats: number): Result<Arrival, CheckinError> {
  const { arrivedCount } = input
  if (!Number.isInteger(arrivedCount) || arrivedCount < 1) {
    return err(
      checkinError('invalid_count', `Cantidad inválida: ${arrivedCount}. Un grupo que no entró no se registra.`),
    )
  }
  if (arrivedCount > seats + MAX_EXTRA_ARRIVALS) {
    return err(
      checkinError(
        'invalid_count',
        `Llegaron ${arrivedCount} y el grupo tiene ${seats} cupos: son más de ${MAX_EXTRA_ARRIVALS} sin invitación.`,
      ),
    )
  }

  return ok({
    scanId: input.scanId,
    guestGroupId: input.guestGroupId,
    arrivedCount,
    scannedAt: input.scannedAt,
    voidedAt: input.voidedAt,
    personIds: input.personIds ?? null,
  })
}

export const isLive = (arrival: Arrival): boolean => arrival.voidedAt === null
