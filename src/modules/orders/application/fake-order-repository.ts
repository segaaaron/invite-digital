import type { Order, OrderStatus } from '../domain/order'
import type { FileStorage, NewOrder, NewQuote, OrderRepository, ProofRow } from './ports'

/** Lo que un pedido nuevo trae sin decir nada (`0073`): sin cotización, sin anticipo, sin recordar. */
export const SIN_EXTRAS_DE_PEDIDO = {
  amountCents: null,
  currency: null,
  consultationId: null,
  origin: 'web',
  quoteExtras: [],
  discountCents: null,
  depositCents: null,
  balancePaidAt: null,
  remindedAt: null,
  cancelReason: null,
  referralCode: null,
} as const satisfies Partial<Order>

/** Doble en memoria del repositorio de pedidos. */
export class FakeOrderRepository implements OrderRepository {
  readonly orders: Order[] = []
  readonly proofs: (ProofRow & { orderId: string })[] = []

  async create(order: NewOrder): Promise<Order> {
    const fila: Order = {
      id: `o${this.orders.length + 1}`,
      publicRef: order.publicRef,
      planSlug: order.planSlug,
      planName: order.planSlug,
      templateSlug: order.templateSlug,
      addonSlug: null,
      addonName: null,
      eventId: null,
      eventSlug: null,
      customerName: order.customerName,
      contact: order.contact,
      eventDate: order.eventDate,
      notes: order.notes,
      status: 'pending_payment',
      decisionNote: null,
      decidedAt: null,
      createdAt: new Date('2026-08-25T00:00:00Z'),
      ...SIN_EXTRAS_DE_PEDIDO,
      referralCode: order.referralCode ?? null,
    }
    this.orders.push(fila)
    return fila
  }

  async createQuote(q: NewQuote): Promise<Order> {
    const fila: Order = {
      ...(await this.create({ publicRef: q.publicRef, planSlug: q.planSlug, templateSlug: q.templateSlug, customerName: q.customerName, contact: q.contact, eventDate: q.eventDate, notes: q.notes })),
      amountCents: q.amountCents,
      currency: 'BOB',
      discountCents: q.discountCents,
      quoteExtras: q.extras,
      consultationId: q.consultationId,
      origin: 'cotizacion',
    }
    this.orders[this.orders.length - 1] = fila
    return fila
  }

  async cancel(id: string, reason: string, at: Date): Promise<boolean> {
    const i = this.orders.findIndex((o) => o.id === id && o.status !== 'approved' && o.status !== 'cancelled')
    const o = this.orders[i]
    if (o === undefined) return false
    this.orders[i] = { ...o, status: 'cancelled', cancelReason: reason, decidedAt: at }
    return true
  }

  async countPaidWithoutEvent(): Promise<number> {
    return this.orders.filter((o) => o.status === 'approved' && o.eventId === null && o.addonSlug === null).length
  }

  async markReminded(id: string, at: Date): Promise<void> {
    const i = this.orders.findIndex((o) => o.id === id)
    const o = this.orders[i]
    if (o !== undefined) this.orders[i] = { ...o, remindedAt: at }
  }

  async markBalancePaid(id: string, at: Date): Promise<boolean> {
    const i = this.orders.findIndex((o) => o.id === id && o.status === 'approved' && o.depositCents !== null && o.balancePaidAt === null)
    const o = this.orders[i]
    if (o === undefined) return false
    this.orders[i] = { ...o, balancePaidAt: at }
    return true
  }

  /** Los extras a la venta en esta prueba. */
  readonly extrasALaVenta = new Set<string>(['mas-40-grupos'])

  async createForAddon(order: { publicRef: string; addonSlug: string; eventId: string; customerName: string; contact: string }): Promise<Order | null> {
    const abierto = this.orders.find((o) => o.eventId === order.eventId && o.addonSlug === order.addonSlug && o.status !== 'approved')
    if (abierto) return abierto
    if (!this.extrasALaVenta.has(order.addonSlug)) return null
    const fila: Order = {
      id: `o${this.orders.length + 1}`,
      publicRef: order.publicRef,
      planSlug: null,
      planName: null,
      templateSlug: null,
      addonSlug: order.addonSlug,
      addonName: order.addonSlug,
      eventId: order.eventId,
      eventSlug: null,
      customerName: order.customerName,
      contact: order.contact,
      eventDate: null,
      notes: null,
      status: 'pending_payment',
      decisionNote: null,
      decidedAt: null,
      createdAt: new Date('2026-08-25T00:00:00Z'),
      ...SIN_EXTRAS_DE_PEDIDO,
    }
    this.orders.push(fila)
    return fila
  }

  async findByRef(publicRef: string): Promise<Order | null> {
    return this.orders.find((o) => o.publicRef === publicRef) ?? null
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.find((o) => o.id === id) ?? null
  }

  async countByStatusAll(): Promise<Record<Order['status'], number>> {
    const conteo = { pending_payment: 0, proof_submitted: 0, approved: 0, rejected: 0, cancelled: 0 }
    for (const o of this.orders) conteo[o.status] += 1
    return conteo
  }

  async listPage(input: { status: Order['status'] | null; limit: number; prioridad: readonly Order['status'][] }): Promise<Order[]> {
    const rango = (s: Order['status']) => (input.prioridad.includes(s) ? input.prioridad.indexOf(s) : input.prioridad.length)
    return this.orders
      .filter((o) => input.status === null || o.status === input.status)
      .sort((a, b) => rango(a.status) - rango(b.status) || b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, input.limit)
  }

  async listAddonOrdersOf(eventId: string): Promise<Order[]> {
    return this.orders.filter((o) => o.eventId === eventId && o.addonSlug !== null)
  }

  async countByStatus(status: Order['status']): Promise<number> {
    return this.orders.filter((o) => o.status === status).length
  }

  async setStatus(input: {
    id: string
    status: OrderStatus
    decisionNote: string | null
    decidedAt: Date | null
  }): Promise<void> {
    const indice = this.orders.findIndex((o) => o.id === input.id)
    if (indice < 0) return
    this.orders[indice] = {
      ...this.orders[indice]!,
      status: input.status,
      decisionNote: input.decisionNote,
      decidedAt: input.decidedAt,
    }
  }

  async linkEvent(orderId: string, eventId: string): Promise<void> {
    const indice = this.orders.findIndex((o) => o.id === orderId)
    if (indice < 0) return
    this.orders[indice] = { ...this.orders[indice]!, eventId }
  }

  async addProof(input: {
    orderId: string
    storageKey: string
    originalName: string
    mime: string
    sizeBytes: number
  }): Promise<void> {
    this.proofs.push({
      id: `p${this.proofs.length + 1}`,
      orderId: input.orderId,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      uploadedAt: new Date('2026-08-25T00:00:00Z'),
    })
  }

  async listProofs(orderId: string): Promise<ProofRow[]> {
    return this.proofs.filter((p) => p.orderId === orderId)
  }

  async listProofsFor(orderIds: readonly string[]): Promise<Map<string, ProofRow[]>> {
    const porPedido = new Map<string, ProofRow[]>()
    for (const proof of this.proofs) {
      if (!orderIds.includes(proof.orderId)) continue
      porPedido.set(proof.orderId, [...(porPedido.get(proof.orderId) ?? []), proof])
    }
    return porPedido
  }

  async findProof(proofId: string): Promise<ProofRow | null> {
    return this.proofs.find((p) => p.id === proofId) ?? null
  }
}

/** Almacén en memoria. Guarda lo escrito para que las pruebas comprueben con qué nombre. */
export class FakeFileStorage implements FileStorage {
  readonly files = new Map<string, Uint8Array>()

  async put(key: string, bytes: Uint8Array): Promise<void> {
    this.files.set(key, bytes)
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.files.get(key) ?? null
  }

  /** Como el de disco: borrar lo que ya no está no es un fallo. */
  async remove(key: string): Promise<void> {
    this.files.delete(key)
  }
}
