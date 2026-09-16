import type { RsvpResponse } from '../domain/rsvp-response'

export type LatestResponse = {
  readonly attending: number
  readonly responderName: string | null
  readonly message: string | null
  readonly respondedAt: Date
}

export interface RsvpRepository {
  /**
   * Cuándo se le permitió a ese grupo volver a responder, o `null` si nunca.
   *
   * Se contesta una sola vez; corregir lo reabre el atelier desde el panel, y esa marca solo
   * vale para la respuesta siguiente.
   */
  reopenedAtFor(guestGroupId: string): Promise<Date | null>
  /** Solo anexa: responder otra vez crea una fila nueva, nunca actualiza la anterior. */
  append(response: RsvpResponse): Promise<void>
  latestFor(guestGroupId: string): Promise<LatestResponse | null>
  tallyRowsFor(eventId: string): Promise<Array<{ seats: number; attending: number | null }>>
  /** Las marcas de tiempo de las respuestas desde `since`, para el gráfico por día. */
  respondedAtsFor(eventId: string, since: Date): Promise<Date[]>
  /**
   * La última respuesta de **cada** grupo del evento, en una sola consulta.
   *
   * Existe para no repetir `latestFor` en un bucle: la lista de invitados lo hacía dos
   * veces por grupo, en serie, así que doscientos grupos eran cuatrocientos viajes a la
   * base para pintar una tabla.
   */
  latestByEvent(eventId: string): Promise<Map<string, LatestResponse>>
}
