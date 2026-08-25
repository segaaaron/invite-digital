import { desc, eq, inArray, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { orderProofs, orders, planTranslations, plans } from '@/shared/db/schema'
import { ORDER_STATUSES, type Order, type OrderStatus } from '../domain/order'
import type { NewOrder, OrderRepository, ProofRow } from '../application/ports'

const esEstado = (valor: string): valor is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(valor)

type Fila = {
  id: string
  publicRef: string
  planSlug: string | null
  planName: string | null
  customerName: string
  contact: string
  eventDate: string | null
  notes: string | null
  status: string
  decisionNote: string | null
  decidedAt: Date | null
  createdAt: Date
}

/**
 * El estado se estrecha aquí y no en la vista: una fila con un estado que el dominio no
 * conoce es una migración a medio aplicar, y prefiero que reviente al leerla que pintar
 * media pantalla con un estado inventado.
 */
const aOrder = (fila: Fila): Order => {
  if (!esEstado(fila.status)) throw new Error(`El pedido ${fila.id} tiene un estado desconocido: ${fila.status}`)
  return { ...fila, status: fila.status }
}

export const createDrizzleOrderRepository = (database: DbExecutor): OrderRepository => {
  // El nombre del plan en español: la bandeja del atelier es solo española, como el
  // resto del panel.
  const seleccion = {
    id: orders.id,
    publicRef: orders.publicRef,
    planSlug: plans.slug,
    planName: planTranslations.name,
    customerName: orders.customerName,
    contact: orders.contact,
    eventDate: orders.eventDate,
    notes: orders.notes,
    status: orders.status,
    decisionNote: orders.decisionNote,
    decidedAt: orders.decidedAt,
    createdAt: orders.createdAt,
  }

  const conPlan = () =>
    database
      .select(seleccion)
      .from(orders)
      // `leftJoin`: `plan_id` es anulable —retirar un plan del catálogo pone a null los
      // pedidos que lo compraron— y con `innerJoin` esos pedidos desaparecerían de la
      // bandeja sin dejar rastro.
      .leftJoin(plans, eq(plans.id, orders.planId))
      .leftJoin(
        planTranslations,
        sql`${planTranslations.planId} = ${plans.id} and ${planTranslations.locale} = 'es'`,
      )

  return {
    async create(order: NewOrder): Promise<Order> {
      const [fila] = await database
        .insert(orders)
        .values({
          publicRef: order.publicRef,
          // El plan se resuelve por su slug dentro del `insert`: leerlo antes dejaría
          // una ventana en la que el plan se retira entre la lectura y la escritura.
          planId: sql`(select id from plans where slug = ${order.planSlug})`,
          customerName: order.customerName,
          contact: order.contact,
          eventDate: order.eventDate,
          notes: order.notes,
        })
        .returning({ id: orders.id })

      if (!fila) throw new Error('No se pudo crear el pedido.')

      const creado = await this.findById(fila.id)
      if (creado === null) throw new Error('El pedido recién creado no se pudo releer.')
      return creado
    },

    async findByRef(publicRef): Promise<Order | null> {
      const [fila] = await conPlan().where(eq(orders.publicRef, publicRef)).limit(1)
      return fila === undefined ? null : aOrder(fila)
    },

    async findById(id): Promise<Order | null> {
      const [fila] = await conPlan().where(eq(orders.id, id)).limit(1)
      return fila === undefined ? null : aOrder(fila)
    },

    async list(): Promise<Order[]> {
      const filas = await conPlan().orderBy(desc(orders.createdAt))
      return filas.map(aOrder)
    },

    async setStatus(input): Promise<void> {
      await database
        .update(orders)
        .set({ status: input.status, decisionNote: input.decisionNote, decidedAt: input.decidedAt })
        .where(eq(orders.id, input.id))
    },

    async addProof(input): Promise<void> {
      await database.insert(orderProofs).values({
        orderId: input.orderId,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mime: input.mime,
        sizeBytes: input.sizeBytes,
      })
    },

    async listProofs(orderId): Promise<ProofRow[]> {
      return database
        .select({
          id: orderProofs.id,
          storageKey: orderProofs.storageKey,
          originalName: orderProofs.originalName,
          mime: orderProofs.mime,
          sizeBytes: orderProofs.sizeBytes,
          uploadedAt: orderProofs.uploadedAt,
        })
        .from(orderProofs)
        .where(eq(orderProofs.orderId, orderId))
        .orderBy(desc(orderProofs.uploadedAt))
    },

    async listProofsFor(orderIds): Promise<Map<string, ProofRow[]>> {
      // `inArray` con la lista vacía genera un `in ()` que Postgres rechaza.
      if (orderIds.length === 0) return new Map()

      const filas = await database
        .select({
          orderId: orderProofs.orderId,
          id: orderProofs.id,
          storageKey: orderProofs.storageKey,
          originalName: orderProofs.originalName,
          mime: orderProofs.mime,
          sizeBytes: orderProofs.sizeBytes,
          uploadedAt: orderProofs.uploadedAt,
        })
        .from(orderProofs)
        .where(inArray(orderProofs.orderId, [...orderIds]))
        .orderBy(desc(orderProofs.uploadedAt))

      const porPedido = new Map<string, ProofRow[]>()
      for (const { orderId, ...proof } of filas) {
        porPedido.set(orderId, [...(porPedido.get(orderId) ?? []), proof])
      }
      return porPedido
    },

    async findProof(proofId): Promise<ProofRow | null> {
      const [fila] = await database
        .select({
          id: orderProofs.id,
          storageKey: orderProofs.storageKey,
          originalName: orderProofs.originalName,
          mime: orderProofs.mime,
          sizeBytes: orderProofs.sizeBytes,
          uploadedAt: orderProofs.uploadedAt,
        })
        .from(orderProofs)
        .where(eq(orderProofs.id, proofId))
        .limit(1)

      return fila ?? null
    },
  }
}

export const drizzleOrderRepository = createDrizzleOrderRepository(db)
