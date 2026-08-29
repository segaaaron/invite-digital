/**
 * Una fila del libro tal y como sale de la lectura: la parte inmutable viene de
 * `rsvp_responses` y la editable de `message_notes`, que puede no existir todavía.
 *
 * `body` es anulable porque `rsvp_responses.message` lo es: confirmar sin escribir nada
 * es normal, y esa respuesta no es una firma del libro. Quien compone `GuestMessage`
 * tiene que estrecharlo.
 */
export type MessageRow = {
  readonly responseId: string
  readonly guestGroupId: string
  readonly groupLabel: string
  /** Quién de ese grupo escribió, si lo dijo al confirmar. */
  readonly responderName: string | null
  readonly body: string | null
  readonly writtenAt: Date
  readonly readAt: Date | null
  readonly featuredAt: Date | null
  readonly reply: string | null
  readonly repliedAt: Date | null
}

/** El evento al que pertenece una respuesta, y el estado que ya tenga su nota. */
export type ResponseContext = {
  readonly responseId: string
  readonly eventId: string
  readonly readAt: Date | null
  readonly featuredAt: Date | null
}

/** Solo el estado editable. El cuerpo del mensaje no se escribe nunca desde aquí. */
export type NotePatch = {
  readonly readAt?: Date | null
  readonly featuredAt?: Date | null
  readonly reply?: string | null
  readonly repliedAt?: Date | null
}

export interface GuestbookRepository {
  /**
   * Todas las respuestas del evento con su nota si la tienen. La unión es por la
   * izquierda: un mensaje recién escrito todavía no tiene nota, y tiene que salir igual.
   */
  listMessages(eventId: string): Promise<MessageRow[]>
  /**
   * El último mensaje de un grupo, con su nota. Lo pide la página del invitado para
   * enseñarle la respuesta a lo que él escribió, sin leer el libro entero del evento.
   */
  findLatestMessageForGroup(guestGroupId: string): Promise<MessageRow | null>
  findResponseEvent(responseId: string): Promise<ResponseContext | null>
  /** `INSERT ... ON CONFLICT DO UPDATE`: marcar leído dos veces actualiza, no revienta. */
  upsertNote(responseId: string, patch: NotePatch): Promise<void>
}
