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

export type TemplateInput = {
  id: string
  slug: string
  categorySlug: string
  categoryName: string
  coverImagePath: string
  palette: { base: string; accent: string }
  sortOrder: number
  name: string
  description: string
}

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function createTemplate(input: TemplateInput): Result<Template, CatalogError> {
  const slug = input.slug.trim()
  if (slug.length === 0) {
    return err(catalogError('invalid_slug', 'El slug de la plantilla no puede estar vacío'))
  }

  const categorySlug = input.categorySlug.trim()
  if (categorySlug.length === 0) {
    return err(
      catalogError('invalid_slug', `La plantilla ${slug} tiene un slug de categoría vacío`),
    )
  }

  const name = input.name.trim()
  if (name.length === 0) {
    return err(catalogError('invalid_name', `La plantilla ${slug} no tiene nombre`))
  }

  const coverImagePath = input.coverImagePath.trim()
  if (coverImagePath.length === 0 || !coverImagePath.startsWith('/')) {
    return err(
      catalogError(
        'invalid_image_path',
        `La plantilla ${slug} tiene una ruta de imagen inválida: "${input.coverImagePath}"`,
      ),
    )
  }

  if (!HEX_COLOR_PATTERN.test(input.palette.base) || !HEX_COLOR_PATTERN.test(input.palette.accent)) {
    return err(
      catalogError(
        'invalid_palette',
        `La plantilla ${slug} tiene colores de paleta inválidos: base="${input.palette.base}" accent="${input.palette.accent}"`,
      ),
    )
  }

  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return err(
      catalogError(
        'invalid_sort_order',
        `La plantilla ${slug} tiene un sortOrder inválido: ${input.sortOrder}`,
      ),
    )
  }

  const categoryName = input.categoryName.trim()
  const description = input.description.trim()

  return ok({
    id: input.id,
    slug,
    categorySlug,
    categoryName,
    coverImagePath,
    palette: { base: input.palette.base, accent: input.palette.accent },
    sortOrder: input.sortOrder,
    name,
    description,
  })
}
