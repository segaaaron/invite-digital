export type DoorGroupRow = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly seats: number
  readonly attending: number | null
  readonly revoked: boolean
  readonly tokenHash: Buffer
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
