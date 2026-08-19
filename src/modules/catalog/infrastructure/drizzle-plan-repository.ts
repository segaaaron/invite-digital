import { and, asc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { planTranslations, plans } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { PlanInput } from '../domain/plan'
import type { PlanRepository } from '../application/ports'

const logMissingTranslations = (locale: Locale, slugs: readonly string[]): void => {
  if (slugs.length === 0) return
  console.error(
    `Traducción faltante en "${locale}" para los planes: ${slugs.join(', ')}. No se muestran en ese idioma.`,
  )
}

export const createDrizzlePlanRepository = (database: DbExecutor): PlanRepository => ({
  // `plan_translations` se une con LEFT JOIN (no INNER JOIN) a propósito, igual que en
  // `drizzle-template-repository.ts`: un plan sin traducción en el idioma pedido borraría
  // silenciosamente una tarifa entera de la página de precios si se usara INNER JOIN.
  // La fila se oculta para ese idioma, pero se registra ruidosamente — perder un precio
  // sin aviso es un incidente de contenido, no algo que deba pasar desapercibido.
  async listActive(locale: Locale): Promise<PlanInput[]> {
    const rows = await database
      .select({
        id: plans.id,
        slug: plans.slug,
        priceCents: plans.priceCents,
        highlighted: plans.highlighted,
        sortOrder: plans.sortOrder,
        name: planTranslations.name,
        tagline: planTranslations.tagline,
        description: planTranslations.description,
        features: planTranslations.features,
      })
      .from(plans)
      .leftJoin(planTranslations, and(eq(planTranslations.planId, plans.id), eq(planTranslations.locale, locale)))
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.sortOrder))

    const complete: PlanInput[] = []
    const missingSlugs: string[] = []

    for (const row of rows) {
      if (row.name === null || row.tagline === null || row.description === null || row.features === null) {
        missingSlugs.push(row.slug)
        continue
      }
      complete.push({
        id: row.id,
        slug: row.slug,
        priceCents: row.priceCents,
        highlighted: row.highlighted,
        sortOrder: row.sortOrder,
        name: row.name,
        tagline: row.tagline,
        description: row.description,
        features: row.features,
      })
    }

    logMissingTranslations(locale, missingSlugs)
    return complete
  },
})

export const drizzlePlanRepository = createDrizzlePlanRepository(db)
