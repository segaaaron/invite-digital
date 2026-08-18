import { err, ok, type Result } from '@/shared/result'
import { catalogError, type CatalogError } from './errors'

export type Palette = { readonly base: string; readonly accent: string }

export type Template = {
  readonly id: string
  readonly slug: string
  readonly categorySlug: string
  readonly categoryName: string
  readonly coverImagePath: string
  readonly palette: Palette
  readonly sortOrder: number
  readonly name: string
  readonly description: string
}

export function createTemplate(input: Template): Result<Template, CatalogError> {
  const slug = input.slug.trim()
  if (slug.length === 0) {
    return err(catalogError('invalid_slug', 'El slug de la plantilla no puede estar vacío'))
  }
  return ok({ ...input, slug })
}
