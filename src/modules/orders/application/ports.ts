import type { Order, OrderStatus } from '../domain/order'
import type { ProofMime } from '../domain/proof'

export type NewOrder = {
  readonly publicRef: string
  readonly planSlug: string
  /** El diseño elegido en el escaparate, o `null` si llegó directo a los planes. */
  readonly templateSlug: string | null
  readonly customerName: string
  readonly contact: string
  readonly eventDate: string | null
  readonly notes: string | null
}

export type ProofRow = {
  readonly id: string
  readonly storageKey: string
  readonly originalName: string
  readonly mime: string
  readonly sizeBytes: number
  readonly uploadedAt: Date
}

export interface OrderRepository {
  create(order: NewOrder): Promise<Order>
  findByRef(publicRef: string): Promise<Order | null>
  findById(id: string): Promise<Order | null>
  list(): Promise<Order[]>
  setStatus(input: { id: string; status: OrderStatus; decisionNote: string | null; decidedAt: Date | null }): Promise<void>
  /** Ata el pedido a la boda que creó al aprobarse. */
  linkEvent(orderId: string, eventId: string): Promise<void>
  addProof(input: {
    orderId: string
    storageKey: string
    originalName: string
    mime: ProofMime
    sizeBytes: number
  }): Promise<void>
  listProofs(orderId: string): Promise<ProofRow[]>
  /**
   * Los comprobantes de varios pedidos de una vez, agrupados por pedido.
   *
   * Existe para que la bandeja del atelier no haga una consulta por fila: veinte pedidos
   * en pantalla serían veintiún viajes a la base para pintar una lista.
   */
  listProofsFor(orderIds: readonly string[]): Promise<Map<string, ProofRow[]>>
  findProof(proofId: string): Promise<ProofRow | null>
}

/**
 * Dónde viven los comprobantes.
 *
 * Es un puerto y no una llamada a `fs` desde el caso de uso para que el día que esto
 * viva en S3 no haya que tocar ni el dominio ni la aplicación. Hoy es disco, **fuera de
 * `public/`**: un comprobante de transferencia lleva nombre, banco y número de cuenta de
 * una persona, y `public/` es internet.
 */
export interface FileStorage {
  put(key: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | null>
}
