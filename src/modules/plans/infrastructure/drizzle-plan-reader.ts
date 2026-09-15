import { and, asc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { events, plans } from '@/shared/db/schema'
import type { PlanReader, PlanRow } from '../application/ports'

const columnas = {
  id: plans.id,
  slug: plans.slug,
  maxGuestGroups: plans.maxGuestGroups,
  includesSeating: plans.includesSeating,
  includesRegistry: plans.includesRegistry,
  includesCheckin: plans.includesCheckin,
  maxDoorPorters: plans.maxDoorPorters,
  maxCohosts: plans.maxCohosts,
  maxHiredPlanners: plans.maxHiredPlanners,
  plannerSuite: plans.plannerSuite,
  maxGalleryPhotos: plans.maxGalleryPhotos,
  guestPhotos: plans.guestPhotos,
  eventPassword: plans.eventPassword,
  csvImport: plans.csvImport,
  onlineDays: plans.onlineDays,
  designChange: plans.designChange,
  priceCents: plans.priceCents,
  priceAnnualCents: plans.priceAnnualCents,
}

export const createDrizzlePlanReader = (database: DbExecutor): PlanReader => ({
  /**
   * El plan del evento. `innerJoin` a propósito: si el evento no tiene plan no hay fila
   * que devolver, y quien pregunta ya sabe qué hacer con el `null` —tratarlo como el
   * plan más barato—. Un `leftJoin` devolvería una fila con todo a nulo, que no es un
   * plan y habría que descartar igual una línea más abajo.
   */
  async findEventPlan(eventId): Promise<PlanRow | null> {
    const [row] = await database
      .select(columnas)
      .from(events)
      .innerJoin(plans, eq(plans.id, events.planId))
      .where(eq(events.id, eventId))
      .limit(1)

    return row ?? null
  },

  /**
   * El más barato de los activos. Se ordena por precio y no por `sortOrder`: el orden
   * de la página de precios es una decisión de escaparate y podría cambiarse mañana sin
   * que nadie relacionara el cambio con qué plan reciben los eventos sin plan.
   */
  async findCheapestActivePlan(): Promise<PlanRow | null> {
    const [row] = await database
      .select(columnas)
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.priceCents))
      .limit(1)

    return row ?? null
  },

  async listActivePlans(): Promise<PlanRow[]> {
    return database.select(columnas).from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.sortOrder))
  },

  async findPlanById(planId): Promise<PlanRow | null> {
    const [row] = await database
      .select(columnas)
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.isActive, true)))
      .limit(1)

    return row ?? null
  },
})

export const drizzlePlanReader = createDrizzlePlanReader(db)
