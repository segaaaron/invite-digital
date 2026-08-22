import { and, asc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventCategories, eventCategoryTranslations, templateTranslations, templates } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { TemplateInput } from '../domain/template'
import type { TemplateRepository } from '../application/ports'
import { partitionTemplateRows, toTemplateInput } from './mappers'

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

const logMissingTranslations = (locale: Locale, slugs: readonly string[]): void => {
  if (slugs.length === 0) return
  console.error(
    `Traducción faltante en "${locale}" para las plantillas: ${slugs.join(', ')}. No se muestran en ese idioma.`,
  )
}

export const createDrizzleTemplateRepository = (database: DbExecutor): TemplateRepository => ({
  // `template_translations` y `event_category_translations` se unen con LEFT JOIN (no
  // INNER JOIN) a propósito. Con INNER JOIN, una plantilla sin traducción en el idioma
  // pedido desaparecería del catálogo sin ningún aviso: silenciosa para quien la
  // publica, invisible para quien revisa el sitio. Se descartaron dos alternativas:
  // tratar la traducción faltante como error de dominio (tumbaría el catálogo entero
  // por una sola fila incompleta) y caer al otro idioma (mezclaría es/en en la misma
  // página, inaceptable en un sitio de lujo). En su lugar: la fila se oculta para ese
  // idioma, pero se registra ruidosamente con `console.error` — ver
  // `partitionTemplateRows` en `./mappers.ts`.
  async listPublished(locale: Locale): Promise<TemplateInput[]> {
    const rows = await database
      .select(selectTemplate)
      .from(templates)
      .leftJoin(
        templateTranslations,
        and(eq(templateTranslations.templateId, templates.id), eq(templateTranslations.locale, locale)),
      )
      .innerJoin(eventCategories, eq(eventCategories.id, templates.categoryId))
      .leftJoin(
        eventCategoryTranslations,
        and(eq(eventCategoryTranslations.categoryId, eventCategories.id), eq(eventCategoryTranslations.locale, locale)),
      )
      .where(eq(templates.isPublished, true))
      .orderBy(asc(templates.sortOrder))

    const { complete, missingSlugs } = partitionTemplateRows(rows)
    logMissingTranslations(locale, missingSlugs)
    return complete.map(toTemplateInput)
  },
})

export const drizzleTemplateRepository = createDrizzleTemplateRepository(db)
