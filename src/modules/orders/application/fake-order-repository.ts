import type { Order, OrderStatus } from '../domain/order'
import type { FileStorage, NewOrder, OrderRepository, ProofRow } from './ports'

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

  async list(): Promise<Order[]> {
    return [...this.orders]
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
