import type { Locale } from '@/shared/i18n/locales'
import type { PlanInput } from '../domain/plan'
import type { TemplateInput } from '../domain/template'

export interface PlanRepository {
  listActive(locale: Locale): Promise<PlanInput[]>
}

export interface TemplateRepository {
  listPublished(locale: Locale): Promise<TemplateInput[]>
  findBySlug(slug: string, locale: Locale): Promise<TemplateInput | null>
}
