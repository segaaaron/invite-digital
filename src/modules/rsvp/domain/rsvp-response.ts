import { err, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from './errors'

const MAX_MESSAGE = 500
/** El nombre de quien contesta: cabe un nombre y dos apellidos con holgura. */
const MAX_NAME = 120

export type RsvpResponse = {
  readonly id: string
  readonly guestGroupId: string
  readonly attending: number
  /** Quién de la familia contestó, o `null` si no lo dijo. */
  readonly responderName: string | null
  readonly message: string | null
  readonly respondedAt: Date
}

export type RsvpResponseInput = {
  id: string
  guestGroupId: string
  attending: number
  responderName: string | null
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

  // El nombre se recorta en vez de rechazarse: quien escribe de más en un campo de texto
  // libre no ha hecho nada malo, y devolverle un error por eso es perder la confirmación.
  const nombre = (input.responderName ?? '').trim().slice(0, MAX_NAME)

  return ok({
    id: input.id,
    guestGroupId: input.guestGroupId,
    attending: input.attending,
    responderName: nombre.length === 0 ? null : nombre,
    message: trimmed.length === 0 ? null : trimmed,
    respondedAt: input.respondedAt,
  })
}
