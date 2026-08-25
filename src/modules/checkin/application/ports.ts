export type DoorGroupRow = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly seats: number
  readonly attending: number | null
  readonly revoked: boolean
  /**
   * Quien encabeza el grupo: la primera persona cargada que no es acompañante.
   *
   * `null` cuando el grupo no tiene personas, que es válido y es el estado de todos los
   * eventos anteriores a `guest_people`. La puerta cae entonces a la etiqueta.
   */
  readonly leadName: string | null
  readonly tokenHash: Buffer
  /** Etiqueta de la mesa asignada, o `null` si el grupo aún no tiene. */
  readonly tableLabel: string | null
}

export type ArrivalRow = {
  readonly scanId: string
  readonly guestGroupId: string
  readonly arrivedCount: number
  readonly scannedAt: Date
  readonly voidedAt: Date | null
}

export interface DoorGroupReader {
  findByTokenHash(tokenHash: Buffer): Promise<DoorGroupRow | null>
  /** Por id, para los casos de uso que parten de una llegada y no del evento. */
  findGroupById(id: string): Promise<DoorGroupRow | null>
  listByEvent(eventId: string): Promise<DoorGroupRow[]>
}

export interface ArrivalRepository {
  /** Devuelve `false` si el `scanId` ya existía: así la idempotencia vive en la base. */
  insertIfAbsent(row: ArrivalRow): Promise<boolean>
  listByEvent(eventId: string): Promise<ArrivalRow[]>
  findByScanId(scanId: string): Promise<ArrivalRow | null>
  adjust(scanId: string, arrivedCount: number): Promise<void>
  void(scanId: string, at: Date): Promise<void>
}
