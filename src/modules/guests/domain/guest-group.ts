import { err, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from './errors'

export type GuestGroup = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly seats: number
  readonly revokedAt: Date | null
  /** Cuándo dio el atelier por repartida la invitación. No es prueba de entrega. */
  readonly invitationSentAt: Date | null
  /** Teléfono para abrir WhatsApp con el destinatario puesto. Opcional a propósito. */
  readonly phone: string | null
}

export type GuestGroupInput = {
  id: string
  eventId: string
  label: string
  seats: number
  revokedAt: Date | null
  invitationSentAt?: Date | null | undefined
  phone?: string | null | undefined
}

const MAX_LABEL = 160

/**
 * La unidad invitada es el grupo, no la persona: en Bolivia se invita a "Familia Rojas
 * Peña, 4 cupos". Una persona sola es un grupo de un cupo — un solo camino de código.
 */
export function createGuestGroup(input: GuestGroupInput): Result<GuestGroup, GuestError> {
  const label = input.label.trim()
  if (label.length === 0 || label.length > MAX_LABEL) {
    return err(guestError('invalid_label', `La etiqueta va de 1 a ${MAX_LABEL} caracteres`))
  }

  if (!Number.isInteger(input.seats) || input.seats < 1) {
    return err(guestError('invalid_seats', `Cupos inválidos: ${input.seats}. Un grupo sin cupos no es una invitación.`))
  }

  return ok({
    id: input.id,
    eventId: input.eventId,
    label,
    seats: input.seats,
    revokedAt: input.revokedAt,
    invitationSentAt: input.invitationSentAt ?? null,
    phone: input.phone?.trim() === '' ? null : (input.phone ?? null),
  })
}

export const isRevoked = (group: GuestGroup): boolean => group.revokedAt !== null
