import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { planTranslations, plans } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { PlanInput } from '../domain/plan'
import type { PlanRepository } from '../application/ports'

export const drizzlePlanRepository: PlanRepository = {
  async listActive(locale: Locale): Promise<PlanInput[]> {
    const rows = await db
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
      .innerJoin(planTranslations, eq(planTranslations.planId, plans.id))
      .where(and(eq(plans.isActive, true), eq(planTranslations.locale, locale)))
      .orderBy(asc(plans.sortOrder))

    return rows.map((row) => ({ ...row, features: row.features }))
  },
}
