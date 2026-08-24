import type { RsvpResponse } from '../domain/rsvp-response'

export type LatestResponse = { readonly attending: number; readonly message: string | null; readonly respondedAt: Date }

export interface RsvpRepository {
  /** Solo anexa: responder otra vez crea una fila nueva, nunca actualiza la anterior. */
  append(response: RsvpResponse): Promise<void>
  latestFor(guestGroupId: string): Promise<LatestResponse | null>
  tallyRowsFor(eventId: string): Promise<Array<{ seats: number; attending: number | null }>>
  /** Las marcas de tiempo de las respuestas desde `since`, para el gráfico por día. */
  respondedAtsFor(eventId: string, since: Date): Promise<Date[]>
}
