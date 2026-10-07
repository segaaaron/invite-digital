import { and, asc, eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { addons, events, planChangeRequests } from '@/shared/db/schema'
import { EFECTOS_DE_EXTRA, type EfectoDeExtra } from '../domain/extras'
import type { PlanChangeRequestRow, PlanChangeStatus, PlansRepository } from '../application/ports'
import { createDrizzlePlanReader } from './drizzle-plan-reader'

const columnas = {
  id: planChangeRequests.id,
  eventId: planChangeRequests.eventId,
  requestedPlanId: planChangeRequests.requestedPlanId,
  note: planChangeRequests.note,
  status: planChangeRequests.status,
  createdAt: planChangeRequests.createdAt,
  resolvedAt: planChangeRequests.resolvedAt,
}

/**
 * `status` es `varchar` en la base y `string` para Drizzle. El estrechamiento vive aquí,
 * en la única frontera por la que esas filas entran: más adentro el tipo ya es estricto.
 */
const comoFila = (row: { [K in keyof typeof columnas]: K extends 'status' ? string : PlanChangeRequestRow[K] }) => ({
  ...row,
  status: row.status as PlanChangeStatus,
})

export const createDrizzlePlansRepository = (database: DbExecutor): PlansRepository => ({
  ...createDrizzlePlanReader(database),

  async findPendingRequest(eventId): Promise<PlanChangeRequestRow | null> {
    const [row] = await database
      .select(columnas)
      .from(planChangeRequests)
      .where(and(eq(planChangeRequests.eventId, eventId), eq(planChangeRequests.status, 'pending')))
      .limit(1)

    return row ? comoFila(row) : null
  },

  async insertRequest(row): Promise<void> {
    // Sin `onConflictDoNothing` a propósito: el índice único parcial tiene que reventar
    // aquí si ya hay una pendiente. Tragarse el conflicto en silencio devolvería «hecho»
    // sobre una solicitud que no se guardó.
    await database.insert(planChangeRequests).values({ ...row, status: 'pending' })
  },

  async findRequest(requestId): Promise<PlanChangeRequestRow | null> {
    const [row] = await database.select(columnas).from(planChangeRequests).where(eq(planChangeRequests.id, requestId)).limit(1)

    return row ? comoFila(row) : null
  },

  /**
   * Cambiar el plan y marcar la solicitud, **en una sola transacción**. Si se cambiara
   * el plan y fallara el marcado, la solicitud quedaría pendiente para siempre sobre un
   * evento que ya cambió, y el atelier volvería a aplicarla.
   *
   * El `where` del UPDATE incluye `status = 'pending'`: entre leer el estado en el caso
   * de uso y escribirlo aquí cabe otra pestaña del panel aplicando la misma solicitud.
   * Que la condición viaje dentro del propio UPDATE es lo que hace que la segunda no
   * encuentre nada que actualizar en vez de aplicar el cambio dos veces.
   */
  async listExtras(soloActivos) {
    const filas = await database
      .select()
      .from(addons)
      .where(soloActivos ? eq(addons.isActive, true) : undefined)
      .orderBy(asc(addons.sortOrder))
    return filas.flatMap((f) =>
      (EFECTOS_DE_EXTRA as readonly string[]).includes(f.effect)
        ? [{ slug: f.slug, name: f.name, priceCents: f.priceCents, currency: f.currency, effect: f.effect as EfectoDeExtra, amount: f.amount, isActive: f.isActive }]
        : [],
    )
  },

  async updateExtra(slug, extra) {
    // **Lo que hace un extra no cambia** una vez creado (28 de septiembre): el efecto no se
    // escribe. Cambiárselo a uno que se está vendiendo cambiaría lo que el cliente cree que compró.
    const filas = await database
      .update(addons)
      .set({ name: extra.name, priceCents: extra.priceCents, amount: extra.amount, isActive: extra.isActive })
      .where(eq(addons.slug, slug))
      .returning({ slug: addons.slug })
    return filas.length > 0
  },

  async applyExtra(orderId): Promise<boolean> {
    return database.transaction(async (tx) => {
      // El efecto y la cantidad se **copian** del extra: editarlo después no reescribe lo vendido.
      const aplicado = await tx.execute<{ event_id: string; effect: string; amount: number }>(sql`
        insert into event_addons (event_id, addon_slug, effect, amount, order_id)
        select o.event_id, a.slug, a.effect, a.amount, o.id
        from orders o join addons a on a.slug = o.addon_slug
        where o.id = ${orderId} and o.event_id is not null
        on conflict (order_id) do nothing
        returning event_id, effect, amount
      `)
      const fila = (aplicado as unknown as Array<{ event_id: string; effect: string; amount: number }>)[0]
      if (fila === undefined) return false
      // Más días en línea son más días antes de anonimizar.
      if (fila.effect === 'mas_dias') {
        await tx.update(events).set({ retentionDays: sql`${events.retentionDays} + ${fila.amount}` }).where(eq(events.id, fila.event_id))
      }
      // Un cambio adicional suma rondas al encargo. Sin encargo no hay rondas que sumar.
      if (fila.effect === 'mas_rondas') {
        await tx.execute(sql`update event_design set rounds_included = rounds_included + ${fila.amount}, updated_at = now() where event_id = ${fila.event_id}`)
      }
      return true
    })
  },

  async applyQuoteExtras(orderId): Promise<number> {
    return database.transaction(async (tx) => {
      // Los extras de una cotización van **en el pedido del plan**, no en pedidos propios: se
      // aplican sin `order_id` (ese índice es único, uno por pedido) y una sola vez por evento y
      // extra, así volver a enlazar el pedido no los suma dos veces.
      const aplicados = (await tx.execute(sql`
        insert into event_addons (event_id, addon_slug, effect, amount)
        select o.event_id, a.slug, a.effect, a.amount
        from orders o
        cross join lateral jsonb_array_elements(coalesce(o.quote_extras, '[]'::jsonb)) as x(extra)
        join addons a on a.slug = x.extra->>'slug'
        where o.id = ${orderId} and o.event_id is not null
          and not exists (
            select 1 from event_addons e where e.event_id = o.event_id and e.addon_slug = a.slug and e.order_id is null
          )
        returning event_id, effect, amount
      `)) as unknown as Aplicados
      await sumarLoAplicado(tx, aplicados)
      return aplicados.length
    })
  },

  async applyExtraWithoutOrder(eventId, addonSlug): Promise<boolean> {
    return database.transaction(async (tx) => {
      // Como los de una cotización: sin `order_id` y una sola vez por evento y extra.
      const aplicados = (await tx.execute(sql`
        insert into event_addons (event_id, addon_slug, effect, amount)
        select ${eventId}, a.slug, a.effect, a.amount
        from addons a
        where a.slug = ${addonSlug}
          and not exists (
            select 1 from event_addons e where e.event_id = ${eventId} and e.addon_slug = a.slug and e.order_id is null
          )
        returning event_id, effect, amount
      `)) as unknown as Aplicados
      await sumarLoAplicado(tx, aplicados)
      return aplicados.length > 0
    })
  },

  async applyRequest(requestId, at): Promise<boolean> {
    return database.transaction(async (tx) => {
      const [marcada] = await tx
        .update(planChangeRequests)
        .set({ status: 'applied', resolvedAt: at })
        .where(and(eq(planChangeRequests.id, requestId), eq(planChangeRequests.status, 'pending')))
        .returning({ eventId: planChangeRequests.eventId, requestedPlanId: planChangeRequests.requestedPlanId })

      if (!marcada) return false

      // Los días en línea viajan con el plan: la retención del evento pasa a ser la del nuevo.
      await tx
        .update(events)
        .set({
          planId: marcada.requestedPlanId,
          retentionDays: sql`coalesce((select online_days from plans where id = ${marcada.requestedPlanId}) + (select coalesce(sum(amount), 0) from event_addons where event_addons.event_id = ${marcada.eventId} and effect = 'mas_dias'), ${events.retentionDays})`,
        })
        .where(eq(events.id, marcada.eventId))
      return true
    })
  },

  async rejectRequest(requestId, at): Promise<boolean> {
    const marcadas = await database
      .update(planChangeRequests)
      .set({ status: 'rejected', resolvedAt: at })
      .where(and(eq(planChangeRequests.id, requestId), eq(planChangeRequests.status, 'pending')))
      .returning({ id: planChangeRequests.id })

    return marcadas.length > 0
  },
})

export const drizzlePlansRepository = createDrizzlePlansRepository(db)

type Aplicados = Array<{ event_id: string; effect: string; amount: number }>

/** Lo que un extra suma fuera de `event_addons`: días en línea y rondas del encargo ya empezado. */
async function sumarLoAplicado(tx: DbExecutor, aplicados: Aplicados): Promise<void> {
  for (const f of aplicados.filter((a) => a.effect === 'mas_dias')) {
    await tx.update(events).set({ retentionDays: sql`${events.retentionDays} + ${f.amount}` }).where(eq(events.id, f.event_id))
  }
  // Con el encargo ya empezado se suman aquí; si aún no existe, lo cuenta al crearse.
  for (const f of aplicados.filter((a) => a.effect === 'mas_rondas')) {
    await tx.execute(sql`update event_design set rounds_included = rounds_included + ${f.amount}, updated_at = now() where event_id = ${f.event_id}`)
  }
}
