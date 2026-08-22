import { err, ok, type Result } from '@/shared/result'
import { guestbookError, type GuestbookError } from './errors'

/**
 * Mil caracteres. La respuesta del atelier a una firma del libro es un agradecimiento,
 * no una carta: un campo sin techo acaba recibiendo pegados enteros por accidente, y ese
 * texto se guarda sobre un dato personal que la retención tendrá que borrar.
 */
export const MAX_REPLY_LENGTH = 1000

/**
 * La respuesta ya comprobada. Recorta los extremos y mide **después** de recortar: mil
 * caracteres rodeados de espacios siguen siendo mil caracteres.
 *
 * Puro: ni reloj ni base. El instante de la respuesta lo pone quien la guarda.
 */
export const createReply = (text: string): Result<string, GuestbookError> => {
  const limpio = text.trim()

  if (limpio.length === 0) {
    return err(guestbookError('invalid_reply', 'La respuesta no puede quedar vacía.'))
  }

  if (limpio.length > MAX_REPLY_LENGTH) {
    return err(
      guestbookError(
        'invalid_reply',
        `La respuesta no puede pasar de ${MAX_REPLY_LENGTH} caracteres; esta tiene ${limpio.length}.`,
      ),
    )
  }

  return ok(limpio)
}

/** Sin leer es no tener instante de lectura. No hay un tercer estado. */
export const isUnread = (note: { readonly readAt: Date | null }): boolean => note.readAt === null

export const isFeatured = (note: { readonly featuredAt: Date | null }): boolean => note.featuredAt !== null
