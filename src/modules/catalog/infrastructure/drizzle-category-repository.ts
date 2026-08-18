import { and, asc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventCategories, eventCategoryTranslations } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { CategoryInput } from '../domain/category'
import type { CategoryRepository } from '../application/ports'

export const createDrizzleCategoryRepository = (database: DbExecutor): CategoryRepository => ({
  // Mismo trato que las plantillas: la traducción se une con LEFT JOIN y una categoría
  // sin traducir se oculta en ese idioma con un aviso ruidoso, en vez de tumbar el
  // formulario entero o mezclar idiomas.
  async listAll(locale: Locale): Promise<CategoryInput[]> {
    const rows = await database
      .select({
        slug: eventCategories.slug,
        name: eventCategoryTranslations.name,
        sortOrder: eventCategories.sortOrder,
      })
      .from(eventCategories)
      .leftJoin(
        eventCategoryTranslations,
        and(eq(eventCategoryTranslations.categoryId, eventCategories.id), eq(eventCategoryTranslations.locale, locale)),
      )
      .orderBy(asc(eventCategories.sortOrder))

    const missing = rows.filter((row) => row.name === null).map((row) => row.slug)
    if (missing.length > 0) {
      console.error(
        `Traducción faltante en "${locale}" para las categorías: ${missing.join(', ')}. No se muestran en ese idioma.`,
      )
    }

    return rows
      .filter((row): row is { slug: string; name: string; sortOrder: number } => row.name !== null)
      .map((row) => ({ slug: row.slug, name: row.name, sortOrder: row.sortOrder }))
  },
})

export const drizzleCategoryRepository = createDrizzleCategoryRepository(db)
