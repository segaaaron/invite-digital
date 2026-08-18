import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventCategories, eventCategoryTranslations, templateTranslations, templates } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { TemplateInput } from '../domain/template'
import type { TemplateRepository } from '../application/ports'
import { toTemplateInput } from './mappers'

const selectTemplate = {
  id: templates.id,
  slug: templates.slug,
  categorySlug: eventCategories.slug,
  categoryName: eventCategoryTranslations.name,
  coverImagePath: templates.coverImagePath,
  palette: templates.palette,
  sortOrder: templates.sortOrder,
  name: templateTranslations.name,
  description: templateTranslations.description,
}

export const drizzleTemplateRepository: TemplateRepository = {
  async listPublished(locale: Locale): Promise<TemplateInput[]> {
    // Devuelve filas crudas: `listTemplates` (capa de aplicación) es quien las valida
    // pasándolas por `createTemplate`, el único punto donde se detecta un dato corrupto.
    const rows = await db
      .select(selectTemplate)
      .from(templates)
      .innerJoin(
        templateTranslations,
        and(eq(templateTranslations.templateId, templates.id), eq(templateTranslations.locale, locale)),
      )
      .innerJoin(eventCategories, eq(eventCategories.id, templates.categoryId))
      .innerJoin(
        eventCategoryTranslations,
        and(eq(eventCategoryTranslations.categoryId, eventCategories.id), eq(eventCategoryTranslations.locale, locale)),
      )
      .where(eq(templates.isPublished, true))
      .orderBy(asc(templates.sortOrder))

    return rows.map(toTemplateInput)
  },

  async findBySlug(slug: string, locale: Locale): Promise<TemplateInput | null> {
    const rows = await db
      .select(selectTemplate)
      .from(templates)
      .innerJoin(
        templateTranslations,
        and(eq(templateTranslations.templateId, templates.id), eq(templateTranslations.locale, locale)),
      )
      .innerJoin(eventCategories, eq(eventCategories.id, templates.categoryId))
      .innerJoin(
        eventCategoryTranslations,
        and(eq(eventCategoryTranslations.categoryId, eventCategories.id), eq(eventCategoryTranslations.locale, locale)),
      )
      .where(and(eq(templates.slug, slug), eq(templates.isPublished, true)))
      .limit(1)

    const row = rows[0]
    return row ? toTemplateInput(row) : null
  },
}
