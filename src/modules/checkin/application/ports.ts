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
  /** `porter:<id>` o `user:<id>`. Opcional: las llegadas anteriores no lo guardaban. */
  readonly recordedBy?: string | null
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

/**
 * Un portero leído de la base, con los datos de su evento que necesita la puerta: la fecha
 * para la ventana horaria y el título y el `slug` para la cabecera.
 */
export type PorterRow = {
  readonly id: string
  readonly eventId: string
  readonly eventSlug: string
  readonly eventTitle: string
  readonly eventDate: string
  readonly name: string
  readonly phone: string | null
  readonly gate: string | null
  readonly tokenHash: Buffer
  readonly pinHash: Buffer
  readonly failedAttempts: number
  readonly lockedUntil: Date | null
  readonly opensHoursBefore: number
  readonly closesHoursAfter: number
  readonly revokedAt: Date | null
  readonly createdAt: Date
}

export type NewPorter = {
  readonly eventId: string
  readonly name: string
  readonly phone: string | null
  readonly gate: string | null
  readonly tokenHash: Buffer
  readonly pinHash: Buffer
  readonly opensHoursBefore: number
  readonly closesHoursAfter: number
  readonly createdByUserId: string | null
}

export interface PorterStore {
  add(porter: NewPorter): Promise<string>
  /** Los que no se han quitado, del más antiguo al más nuevo. */
  listActive(eventId: string): Promise<PorterRow[]>
  countActive(eventId: string): Promise<number>
  findByTokenHash(hash: Buffer): Promise<PorterRow | null>
  /**
   * Suma un intento fallido **en la base** (`+ 1`) y, si llega al tope, bloquea hasta la
   * fecha dada. Leer y reescribir perdería intentos con dos PIN a la vez.
   */
  registerFailure(id: string, lockUntilIfReached: Date, maxAttempts: number): Promise<void>
  resetFailures(id: string): Promise<void>
  /** `false` si no existía, ya estaba quitado o es de otro evento. */
  revoke(id: string, eventId: string, at: Date): Promise<boolean>
  /** Por portero: cuántas llegadas registró (sin las deshechas) y cuándo la última. */
  arrivalsByPorter(eventId: string): Promise<Record<string, { registradas: number; ultima: Date }>>
}
