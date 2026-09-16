/** Una invitación tal como la leen las páginas del panel: la fila más su última respuesta. */
export type GuestGroupRowView = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly revokedAt: Date | null
  /** Cupos confirmados en la última respuesta; `null` si el grupo aún no respondió. */
  readonly confirmed: number | null
  /** Cuándo dio el atelier por repartida la invitación. No es prueba de entrega. */
  readonly invitationSentAt?: Date | null
  readonly phone?: string | null
  /** Cuándo entró el grupo. El resumen lo usa para el «↑ N esta semana». */
  readonly createdAt?: Date
}
