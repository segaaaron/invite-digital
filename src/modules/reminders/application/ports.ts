import type { ReminderCandidate, ReminderKind } from '../domain/due'

/** El evento visto desde aquí: solo el cierre y el idioma en que se escribe el mensaje. */
export type ReminderEvent = {
  readonly id: string
  readonly locale: string
  readonly rsvpDeadline: Date
}

export interface ReminderRepository {
  /**
   * Los grupos del evento con todo lo que las reglas miran: si se repartió, si se abrió,
   * si contestó y cuándo se le recordó cada motivo por última vez.
   *
   * Viene ya compuesto de la base y no de tres lecturas cosidas arriba: la última fecha
   * por motivo es una agregación, y traerla fila a fila serían tantas consultas como
   * grupos tenga la boda.
   */
  listCandidates(eventId: string): Promise<ReminderCandidate[]>
  /** El grupo pertenece a este evento. Sirve para no fiarse del identificador que llega del formulario. */
  findGroupEvent(guestGroupId: string): Promise<{ eventId: string } | null>
  logReminder(guestGroupId: string, kind: ReminderKind, sentAt: Date): Promise<void>
}
