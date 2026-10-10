import type { Order, OrderStatus, QuoteExtra } from '../domain/order'
import type { ProofMime } from '../domain/proof'

export type NewOrder = {
  readonly publicRef: string
  readonly planSlug: string
  /** El diseño elegido en el escaparate, o `null` si llegó directo a los planes. */
  readonly templateSlug: string | null
  readonly customerName: string
  readonly contact: string
  readonly email?: string | null
  readonly eventDate: string | null
  readonly notes: string | null
  /** El código de quien lo recomendó, ya validado. */
  readonly referralCode?: string | null
  /** El descuento de recomendación, en porcentaje, que se aplica al precio de lista. */
  readonly descuentoPct?: number
  /** Los adicionales elegidos al pedir, ya filtrados por plan en la frontera. El precio lo pone la base. */
  readonly extraSlugs?: readonly string[]
}

/** Una cotización: el pedido que arma el admin con su precio, sus extras y su descuento. */
export type NewQuote = {
  readonly publicRef: string
  readonly planSlug: string
  readonly templateSlug: string | null
  readonly customerName: string
  readonly contact: string
  readonly eventDate: string | null
  readonly notes: string | null
  readonly consultationId: string | null
  /** Lo que paga, ya con extras y descuento. */
  readonly amountCents: number
  readonly discountCents: number | null
  readonly extras: readonly QuoteExtra[]
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
  createQuote(quote: NewQuote): Promise<Order>
  /** Cancela si no está cobrado ni cancelado. `false`: no se podía. */
  cancel(id: string, reason: string, at: Date): Promise<boolean>
  markReminded(id: string, at: Date): Promise<void>
  /** Registra el saldo de un pedido aprobado con anticipo. `false`: no había saldo pendiente. */
  markBalancePaid(id: string, at: Date): Promise<boolean>
  /**
   * Un pedido de extra para un evento. **Idempotente**: con un pedido abierto (no aprobado) del
   * mismo extra en ese evento, devuelve ese. `null` si el extra no existe o no está a la venta.
   */
  createForAddon(order: { publicRef: string; addonSlug: string; eventId: string; customerName: string; contact: string }): Promise<Order | null>
  findByRef(publicRef: string): Promise<Order | null>
  findById(id: string): Promise<Order | null>
  /** Los pedidos de extras de un evento, del más nuevo al más viejo. */
  /** El pedido del plan con el que nació el evento (no los extras), el más reciente. */
  planOrderOf(eventId: string): Promise<Order | null>
  listAddonOrdersOf(eventId: string): Promise<Order[]>
  /** Cuántos pedidos hay en cada estado, en una consulta. */
  countByStatusAll(): Promise<Record<OrderStatus, number>>
  /**
   * Una página de la bandeja, en la base: filtrada por estado (`null` = todos), ordenada por
   * `prioridad` y luego lo más nuevo, y cortada en `limit`.
   */
  listPage(input: { status: OrderStatus | null; limit: number; prioridad: readonly OrderStatus[] }): Promise<Order[]>
  /** Pedidos de plan cobrados que todavía no tienen su evento: la venta más urgente. */
  countPaidWithoutEvent(): Promise<number>
  /** Cuántos pedidos hay en un estado, sin traerlos. */
  countByStatus(status: OrderStatus): Promise<number>
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
  /**
   * Borra un fichero. **Borrar lo que ya no está no es un fallo**: quien limpia puede
   * pasar dos veces, igual que la retención de las fotografías del evento.
   *
   * Nació sin él, y eso dejaba un hueco real: el almacén no sabía borrar, así que un
   * comprobante vencido no podía irse del disco aunque su pedido ya no existiera.
   */
  remove(key: string): Promise<void>
}
