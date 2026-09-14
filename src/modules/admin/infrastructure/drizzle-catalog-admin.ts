import { TransactionRollbackError, asc, eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { planTranslations, plans, templates } from '@/shared/db/schema'
import type { CatalogAdmin, PlanAdminRow } from '../application/ports'

export const createDrizzleCatalogAdmin = (database: DbExecutor): CatalogAdmin => ({
  async listPlans() {
    const filas = await database
      .select({
        id: plans.id,
        slug: plans.slug,
        priceCents: plans.priceCents,
        currency: plans.currency,
        maxGuestGroups: plans.maxGuestGroups,
        includesSeating: plans.includesSeating,
        includesRegistry: plans.includesRegistry,
        includesCheckin: plans.includesCheckin,
        highlighted: plans.highlighted,
        isActive: plans.isActive,
        // Nombres escritos a mano: interpolar `${plans.id}` en la subconsulta sale como
        // `"id"` a secas y contaría los eventos contra sí mismos.
        eventos: sql<number>`(select count(*)::int from events where events.plan_id = plans.id)`,
      })
      .from(plans)
      .orderBy(asc(plans.sortOrder))

    const textos = await database.select().from(planTranslations)

    return filas.map((fila): PlanAdminRow => {
      const de = (locale: string) => {
        const t = textos.find((x) => x.planId === fila.id && x.locale === locale)
        return t ? { name: t.name, tagline: t.tagline, description: t.description, features: [...t.features] } : null
      }
      return { ...fila, es: de('es'), en: de('en') }
    })
  },

  async savePlan(slug, plan) {
    return database.transaction(async (tx) => {
      // Bloquea las filas de planes: la segunda transacción que quiera retirar otro plan
      // espera aquí a que la primera termine, y entonces ya ve el recuento de verdad.
      await tx.execute(sql`select id from plans for update`)
      const [fila] = await tx
        .update(plans)
        .set({
          priceCents: plan.priceCents,
          maxGuestGroups: plan.maxGuestGroups,
          includesSeating: plan.includesSeating,
          includesRegistry: plan.includesRegistry,
          includesCheckin: plan.includesCheckin,
          highlighted: plan.highlighted,
          isActive: plan.isActive,
          updatedAt: new Date(),
        })
        .where(eq(plans.slug, slug))
        .returning({ id: plans.id })
      if (fila === undefined) return 'no_existe'

      const [activos] = await tx.execute<{ total: number }>(sql`select count(*)::int as total from plans where is_active`)
      if ((activos?.total ?? 0) === 0) {
        // Deshace el `update` de arriba: lanzar dentro de la transacción es cómo se revierte.
        tx.rollback()
      }

      for (const locale of ['es', 'en'] as const) {
        const texto = plan[locale]
        await tx
          .insert(planTranslations)
          .values({ planId: fila.id, locale, ...texto })
          .onConflictDoUpdate({
            target: [planTranslations.planId, planTranslations.locale],
            set: { name: texto.name, tagline: texto.tagline, description: texto.description, features: texto.features },
          })
      }
      return 'ok' as const
    }).catch((causa: unknown) => {
      if (causa instanceof TransactionRollbackError) return 'ultimo_activo' as const
      throw causa
    })
  },

  async publication() {
    const filas = await database.select({ slug: templates.slug, isPublished: templates.isPublished }).from(templates)
    return Object.fromEntries(filas.map((f) => [f.slug, f.isPublished]))
  },

  async setPublished(slug, published) {
    const filas = await database
      .update(templates)
      .set({ isPublished: published, updatedAt: new Date() })
      .where(eq(templates.slug, slug))
      .returning({ id: templates.id })
    return filas.length > 0
  },
})

export const drizzleCatalogAdmin = createDrizzleCatalogAdmin(db)
