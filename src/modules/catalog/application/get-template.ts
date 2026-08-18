import { err, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import { catalogError, type CatalogError } from '../domain/errors'
import { createTemplate, type Template } from '../domain/template'
import type { TemplateRepository } from './ports'

export const getTemplate =
  (deps: { templates: TemplateRepository }) =>
  async (slug: string, locale: Locale): Promise<Result<Template, CatalogError>> => {
    const found = await deps.templates.findBySlug(slug, locale)
    if (!found) return err(catalogError('not_found', `No existe la plantilla ${slug}`))
    return createTemplate(found)
  }
