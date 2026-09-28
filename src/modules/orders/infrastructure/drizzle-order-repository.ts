import { and, count, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { addons, events, orderProofs, orders, planTranslations, plans } from '@/shared/db/schema'
import { ORDER_STATUSES, parseOrigin, type Order, type OrderStatus, type QuoteExtra } from '../domain/order'
import type { NewOrder, OrderRepository, ProofRow } from '../application/ports'

const esEstado = (valor: string): valor is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(valor)

type Fila = {
  id: string
  publicRef: string
  planSlug: string | null
  planName: string | null
  templateSlug: string | null
  addonSlug: string | null
  addonName: string | null
  eventId: string | null
  eventSlug: string | null
  customerName: string
  contact: string
  eventDate: string | null
  notes: string | null
  status: string
  decisionNote: string | null
  decidedAt: Date | null
  createdAt: Date
  amountCents: number | null
  currency: string | null
  consultationId: string | null
  origin: string
  quoteExtras: readonly QuoteExtra[] | null
  discountCents: number | null
  depositCents: number | null
  balancePaidAt: Date | null
  remindedAt: Date | null
  cancelReason: string | null
  referralCode: string | null
}

/**
 * El estado se estrecha aquí y no en la vista: una fila con un estado que el dominio no
 * conoce es una migración a medio aplicar, y prefiero que reviente al leerla que pintar
 * media pantalla con un estado inventado.
 */
const aOrder = (fila: Fila): Order => {
  if (!esEstado(fila.status)) throw new Error(`El pedido ${fila.id} tiene un estado desconocido: ${fila.status}`)
  return { ...fila, status: fila.status, origin: parseOrigin(fila.origin), quoteExtras: fila.quoteExtras ?? [] }
}

export const createDrizzleOrderRepository = (database: DbExecutor): OrderRepository => {
  // El nombre del plan en español: la bandeja del atelier es solo española, como el
  // resto del panel.
  const seleccion = {
    id: orders.id,
    publicRef: orders.publicRef,
    planSlug: plans.slug,
    planName: planTranslations.name,
    // El diseño elegido vive en el propio pedido, no en `templates`: los temas están en el
    // código y la tabla solo los publica.
    templateSlug: orders.templateSlug,
    addonSlug: orders.addonSlug,
    addonName: addons.name,
    eventId: orders.eventId,
    // El `slug` viaja con el pedido para que la bandeja pueda enlazar a la boda. Derivarlo
    // de la referencia funcionaría hoy y se rompería el día que el atelier renombre el
    // evento, que es algo que la pantalla de Configuración permite.
    eventSlug: events.slug,
    customerName: orders.customerName,
    contact: orders.contact,
    eventDate: orders.eventDate,
    notes: orders.notes,
    status: orders.status,
    decisionNote: orders.decisionNote,
    decidedAt: orders.decidedAt,
    createdAt: orders.createdAt,
    amountCents: orders.amountCents,
    currency: orders.currency,
    consultationId: orders.consultationId,
    origin: orders.origin,
    quoteExtras: orders.quoteExtras,
    discountCents: orders.discountCents,
    depositCents: orders.depositCents,
    balancePaidAt: orders.balancePaidAt,
    remindedAt: orders.remindedAt,
    cancelReason: orders.cancelReason,
    referralCode: orders.referralCode,
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
      // `leftJoin` también aquí: la mayoría de los pedidos no tienen boda —no se han
      // aprobado—, y con `innerJoin` desaparecerían de la bandeja justo los que esperan
      // decisión.
      .leftJoin(events, eq(events.id, orders.eventId))
      .leftJoin(addons, eq(addons.slug, orders.addonSlug))

  return {
    async create(order: NewOrder): Promise<Order> {
      const descuento = Math.min(50, Math.max(0, Math.round(order.descuentoPct ?? 0)))
      const [fila] = await database
        .insert(orders)
        .values({
          publicRef: order.publicRef,
          // El plan se resuelve por su slug dentro del `insert`: leerlo antes dejaría
          // una ventana en la que el plan se retira entre la lectura y la escritura.
          //
          // **Solo un plan activo.** Desde que el admin retira planes desde el panel, la
          // página del pedido da 404 a uno retirado, pero la Server Action es un extremo
          // público: con un POST directo se compraba igual, al precio del plan retirado.
          // Retirado se trata como inexistente —pedido sin plan, que no revienta el alta—.
          planId: sql`(select id from plans where slug = ${order.planSlug} and is_active)`,
          // El precio se congela en el mismo `insert` y por la misma razón: leído antes, un
          // cambio de precio entre medias dejaría el pedido con el importe de otro momento.
          // Con recomendación, el descuento se aplica en la misma escritura y se congela con él.
          amountCents: sql`(select round(price_cents * (100 - ${descuento}::integer) / 100.0)::integer from plans where slug = ${order.planSlug} and is_active)`,
          discountCents: descuento === 0 ? null : sql`(select price_cents - round(price_cents * (100 - ${descuento}::integer) / 100.0)::integer from plans where slug = ${order.planSlug} and is_active)`,
          currency: sql`(select currency from plans where slug = ${order.planSlug} and is_active)`,
          // El anticipo, con el porcentaje del plan en ese mismo instante, redondeado al boliviano.
          depositCents: sql`(select case when deposit_pct between 1 and 99 then round(round(price_cents * (100 - ${descuento}::integer) / 100.0) * deposit_pct / 10000.0) * 100 end from plans where slug = ${order.planSlug} and is_active)`,
          referralCode: order.referralCode ?? null,
          templateSlug: order.templateSlug,
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

    async createQuote(q) {
      // La cotización la arma el admin: el importe es el suyo (con descuento), no el de lista. El
      // anticipo sale del porcentaje del plan **sobre ese importe**.
      const [fila] = await database
        .insert(orders)
        .values({
          publicRef: q.publicRef,
          planId: sql`(select id from plans where slug = ${q.planSlug} and is_active)`,
          amountCents: q.amountCents,
          currency: sql`(select currency from plans where slug = ${q.planSlug} and is_active)`,
          depositCents: sql`(select case when deposit_pct between 1 and 99 then round(${q.amountCents}::integer * deposit_pct / 10000.0) * 100 end from plans where slug = ${q.planSlug} and is_active)`,
          discountCents: q.discountCents,
          quoteExtras: q.extras,
          templateSlug: q.templateSlug,
          customerName: q.customerName,
          contact: q.contact,
          eventDate: q.eventDate,
          notes: q.notes,
          consultationId: q.consultationId,
          origin: 'cotizacion',
        })
        .returning({ id: orders.id })
      if (!fila) throw new Error('No se pudo crear la cotización.')
      const creado = await this.findById(fila.id)
      if (creado === null) throw new Error('La cotización recién creada no se pudo releer.')
      return creado
    },

    async cancel(id, reason, at) {
      // Solo lo que no está cobrado ni cancelado: lo decide el `where`, no una lectura previa.
      const filas = await database
        .update(orders)
        .set({ status: 'cancelled', cancelReason: reason, decidedAt: at })
        .where(and(eq(orders.id, id), sql`${orders.status} not in ('approved', 'cancelled')`))
        .returning({ id: orders.id })
      return filas.length > 0
    },

    async markReminded(id, at) {
      await database.update(orders).set({ remindedAt: at }).where(eq(orders.id, id))
    },

    async markBalancePaid(id, at) {
      const filas = await database
        .update(orders)
        .set({ balancePaidAt: at })
        .where(and(eq(orders.id, id), eq(orders.status, 'approved'), isNotNull(orders.depositCents), sql`${orders.balancePaidAt} is null`))
        .returning({ id: orders.id })
      return filas.length > 0
    },

    async createForAddon(order) {
      // El precio se congela desde el extra **activo** en la misma escritura: apagado, no hay
      // fila que insertar, y un POST directo no compra un extra que ya no se vende.
      // Idempotente: con un pedido abierto del mismo extra en ese evento se devuelve ese. Lo
      // decide el índice único parcial (`0048`), no una lectura previa: dos clics a la vez
      // pasarían los dos por una lectura.
      const filas = await database.execute<{ id: string }>(sql`
        insert into orders (public_ref, addon_slug, event_id, customer_name, contact, amount_cents, currency)
        select ${order.publicRef}, a.slug, ${order.eventId}, ${order.customerName}, ${order.contact}, a.price_cents, a.currency
        from addons a where a.slug = ${order.addonSlug} and a.is_active
        on conflict (event_id, addon_slug) where addon_slug is not null and event_id is not null and status <> 'approved' do nothing
        returning id
      `)
      const id = (filas as unknown as Array<{ id: string }>)[0]?.id
      if (id !== undefined) return this.findById(id)
      const [abierto] = await database
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.eventId, order.eventId), eq(orders.addonSlug, order.addonSlug), ne(orders.status, 'approved')))
        .limit(1)
      return abierto === undefined ? null : this.findById(abierto.id)
    },

    async findByRef(publicRef): Promise<Order | null> {
      const [fila] = await conPlan().where(eq(orders.publicRef, publicRef)).limit(1)
      return fila === undefined ? null : aOrder(fila)
    },

    async findById(id): Promise<Order | null> {
      const [fila] = await conPlan().where(eq(orders.id, id)).limit(1)
      return fila === undefined ? null : aOrder(fila)
    },

    async listAddonOrdersOf(eventId): Promise<Order[]> {
      const filas = await conPlan()
        .where(and(eq(orders.eventId, eventId), isNotNull(orders.addonSlug)))
        .orderBy(desc(orders.createdAt))
      return filas.map(aOrder)
    },

    async countByStatusAll() {
      const filas = await database.select({ status: orders.status, total: count() }).from(orders).groupBy(orders.status)
      const conteo = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
      for (const { status, total } of filas) if ((ORDER_STATUSES as readonly string[]).includes(status)) conteo[status as OrderStatus] = total
      return conteo
    },

    async listPage({ status, limit, prioridad }): Promise<Order[]> {
      // La prioridad llega de la bandeja y se traduce a un CASE con parámetros: un solo sitio
      // decide qué va primero. Lo que no esté en la lista va detrás.
      const orden = sql`case ${sql.join(
        prioridad.map((s, i) => sql`when ${orders.status} = ${s} then ${i}`),
        sql` `,
      )} else ${prioridad.length} end`
      const filas = await conPlan()
        .where(status === null ? undefined : eq(orders.status, status))
        .orderBy(orden, desc(orders.createdAt))
        .limit(limit)
      return filas.map(aOrder)
    },

    async countPaidWithoutEvent(): Promise<number> {
      const [fila] = await database
        .select({ total: count() })
        .from(orders)
        .where(and(eq(orders.status, 'approved'), sql`${orders.eventId} is null`, sql`${orders.addonSlug} is null`))
      return fila?.total ?? 0
    },

    async countByStatus(status): Promise<number> {
      const [fila] = await database.select({ total: count() }).from(orders).where(eq(orders.status, status))
      return fila?.total ?? 0
    },

    async setStatus(input): Promise<void> {
      await database
        .update(orders)
        .set({ status: input.status, decisionNote: input.decisionNote, decidedAt: input.decidedAt })
        .where(eq(orders.id, input.id))
    },

    async linkEvent(orderId, eventId): Promise<void> {
      await database.update(orders).set({ eventId }).where(eq(orders.id, orderId))
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
