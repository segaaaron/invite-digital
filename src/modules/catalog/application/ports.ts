import type { Locale } from '@/shared/i18n/locales'
import type { CategoryInput } from '../domain/category'
import type { PlanInput } from '../domain/plan'
import type { TemplateInput } from '../domain/template'

export interface PlanRepository {
  listActive(locale: Locale): Promise<PlanInput[]>
}

export interface TemplateRepository {
  listPublished(locale: Locale): Promise<TemplateInput[]>
}

export interface CategoryRepository {
  listAll(locale: Locale): Promise<CategoryInput[]>
}
