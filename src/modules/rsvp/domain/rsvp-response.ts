import { err, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from './errors'

const MAX_MESSAGE = 500

export type RsvpResponse = {
  readonly id: string
  readonly guestGroupId: string
  readonly attending: number
  readonly message: string | null
  readonly respondedAt: Date
}

export type RsvpResponseInput = {
  id: string
  guestGroupId: string
  attending: number
  message: string | null
  respondedAt: Date
}

export function createRsvpResponse(input: RsvpResponseInput, limits: { seats: number }): Result<RsvpResponse, RsvpError> {
  if (!Number.isInteger(input.attending) || input.attending < 0) {
    return err(rsvpError('invalid_payload', `Asistentes inválidos: ${input.attending}`))
  }

  if (input.attending > limits.seats) {
    return err(rsvpError('too_many_seats', `${input.attending} asistentes para ${limits.seats} cupos`))
  }

  const trimmed = input.message?.trim() ?? ''
  if (trimmed.length > MAX_MESSAGE) {
    return err(rsvpError('invalid_payload', `El mensaje pasa de ${MAX_MESSAGE} caracteres`))
  }

  return ok({
    id: input.id,
    guestGroupId: input.guestGroupId,
    attending: input.attending,
    message: trimmed.length === 0 ? null : trimmed,
    respondedAt: input.respondedAt,
  })
}
