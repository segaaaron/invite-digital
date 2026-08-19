import { isErr, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import type { CatalogError } from '../domain/errors'
import { createTemplate, type Template } from '../domain/template'
import type { TemplateRepository } from './ports'

export const listTemplates =
  (deps: { templates: TemplateRepository }) =>
  async (locale: Locale): Promise<Result<Template[], CatalogError>> => {
    const rows = await deps.templates.listPublished(locale)
    const built: Template[] = []

    for (const row of rows) {
      const template = createTemplate(row)
      if (isErr(template)) return template
      built.push(template.value)
    }

    built.sort((a, b) => a.sortOrder - b.sortOrder)
    return ok(built)
  }
