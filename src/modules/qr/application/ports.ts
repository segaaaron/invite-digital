import type { QrKind } from '../domain/qr-code'

export type QrRow = {
  readonly id: string
  readonly userId: string
  readonly eventId: string | null
  readonly label: string
  readonly kind: string
  readonly target: string
  readonly active: boolean
  readonly scanCount: number
  readonly lastScanAt: Date | null
  readonly createdAt: Date
}

export interface QrRepository {
  insert(row: {
    id: string
    userId: string
    eventId: string | null
    label: string
    kind: QrKind
    target: string
  }): Promise<void>
  listByEvent(eventId: string): Promise<QrRow[]>
  findById(id: string): Promise<QrRow | null>
  update(id: string, patch: { label?: string; target?: string; active?: boolean }): Promise<void>
  remove(id: string): Promise<void>
  /**
   * Suma un escaneo. Es un `UPDATE ... set scan_count = scan_count + 1`, no un `SELECT`
   * seguido de un `UPDATE`: dos invitados escaneando el mismo cartel a la vez perderían
   * una cuenta con la versión ingenua.
   */
  countScan(id: string, at: Date): Promise<void>
}
