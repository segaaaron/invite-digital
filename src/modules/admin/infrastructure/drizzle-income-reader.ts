import { and, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { events, orders, planTranslations } from '@/shared/db/schema'
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
        planName: planTranslations.name,
        decidedAt: orders.decidedAt,
        createdAt: orders.createdAt,
        eventSlug: events.slug,
      })
      .from(orders)
      .leftJoin(planTranslations, and(eq(planTranslations.planId, orders.planId), eq(planTranslations.locale, 'es')))
      .leftJoin(events, eq(events.id, orders.eventId))
  },
})

export const drizzleIncomeReader = createDrizzleIncomeReader(db)
