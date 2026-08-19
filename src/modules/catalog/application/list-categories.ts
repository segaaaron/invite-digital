import type { Locale } from '@/shared/i18n/locales'
import { isErr, ok, type Result } from '@/shared/result'
import { createCategory, type Category } from '../domain/category'
import type { CatalogError } from '../domain/errors'
import type { CategoryRepository } from './ports'

export const listCategories =
  (deps: { categories: CategoryRepository }) =>
  async (locale: Locale): Promise<Result<Category[], CatalogError>> => {
    const rows = await deps.categories.listAll(locale)
    const built: Category[] = []

    for (const row of rows) {
      const category = createCategory(row)
      if (isErr(category)) return category
      built.push(category.value)
    }

    built.sort((a, b) => a.sortOrder - b.sortOrder)
    return ok(built)
  }
