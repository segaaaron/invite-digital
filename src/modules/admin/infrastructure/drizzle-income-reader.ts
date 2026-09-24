import { and, eq, gte, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { addons, consultationRequests, events, orders, planTranslations } from '@/shared/db/schema'
import type { IncomeReader } from '../application/ports'

export const createDrizzleIncomeReader = (database: DbExecutor): IncomeReader => ({
  async pedidos() {
    // `leftJoin` en los dos: un pedido sin plan o sin boda es dinero igual.
    return database
      .select({
        ref: orders.publicRef,
        customerName: orders.customerName,
        status: orders.status,
        amountCents: orders.amountCents,
        currency: orders.currency,
        // Un extra suma como su propio renglón, con su nombre.
        planName: sql<string | null>`coalesce(${planTranslations.name}, ${addons.name})`,
        decidedAt: orders.decidedAt,
        createdAt: orders.createdAt,
        eventSlug: events.slug,
      })
      .from(orders)
      .leftJoin(planTranslations, and(eq(planTranslations.planId, orders.planId), eq(planTranslations.locale, 'es')))
      .leftJoin(events, eq(events.id, orders.eventId))
      .leftJoin(addons, eq(addons.slug, orders.addonSlug))
  },

  async conteoDeVenta(desde) {
    // Dos pasadas agregadas, una por tabla. Los pedidos de un extra no cuentan: no son una venta
    // nueva, son un evento que ya existía comprando algo más.
    const [consultas] = await database
      .select({
        total: sql<number>`count(*)::int`,
        ganadas: sql<number>`count(*) filter (where ${consultationRequests.status} = 'won')::int`,
      })
      .from(consultationRequests)
      .where(gte(consultationRequests.createdAt, desde))
    const [pedidos] = await database
      .select({
        total: sql<number>`count(*)::int`,
        pagados: sql<number>`count(*) filter (where ${orders.status} = 'approved')::int`,
        conEvento: sql<number>`count(*) filter (where ${orders.status} = 'approved' and ${orders.eventId} is not null)::int`,
      })
      .from(orders)
      .where(and(gte(orders.createdAt, desde), sql`${orders.addonSlug} is null`))
    return {
      consultas: consultas?.total ?? 0,
      consultasGanadas: consultas?.ganadas ?? 0,
      pedidos: pedidos?.total ?? 0,
      pagados: pedidos?.pagados ?? 0,
      conEvento: pedidos?.conEvento ?? 0,
    }
  },

  async cifrasDelMes(mes) {
    // Una pasada: el mes se mira en hora de Bolivia, como `resumirIngresos`. Sin importe no suma
    // (anteriores a la 0037), igual que allí.
    const [fila] = await database
      .select({
        esteMes: sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'approved' and to_char(${orders.decidedAt} at time zone 'America/La_Paz', 'YYYY-MM') = ${mes}), 0)::int`,
        porRevisar: sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'proof_submitted'), 0)::int`,
        sinPago: sql<number>`coalesce(sum(${orders.amountCents}) filter (where ${orders.status} = 'pending_payment'), 0)::int`,
      })
      .from(orders)
    return { esteMes: fila?.esteMes ?? 0, porRevisar: fila?.porRevisar ?? 0, sinPago: fila?.sinPago ?? 0 }
  },
})

export const drizzleIncomeReader = createDrizzleIncomeReader(db)
