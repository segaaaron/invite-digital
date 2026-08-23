import { err, ok, type Result } from '@/shared/result'
import { catalogError, type CatalogError } from './errors'

export type Palette = { readonly base: string; readonly accent: string }

/** Lo que la tarjeta de modelo dibuja: es escaparate, no un evento de verdad. */
export type TemplateSample = {
  readonly monogram: string
  readonly names: string
  readonly dateLabel: string
  readonly venue: string
}

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
  /** `null` en las plantillas que aún no tienen muestra cargada. */
  readonly sample: TemplateSample | null
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
  sample?:
    | {
        monogram?: string | undefined
        names?: string | undefined
        dateLabel?: string | undefined
        venue?: string | undefined
      }
    | null
    | undefined
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

  // La muestra está completa o no está: media tarjeta con el monograma y sin nombres se
  // vería como un fallo de carga, no como un modelo.
  const s = input.sample
  const sample =
    s && s.monogram && s.names && s.dateLabel && s.venue
      ? { monogram: s.monogram, names: s.names, dateLabel: s.dateLabel, venue: s.venue }
      : null

  return ok({
    id: input.id,
    slug,
    categorySlug,
    categoryName,
    sample,
    coverImagePath,
    palette: { base: input.palette.base, accent: input.palette.accent },
    sortOrder: input.sortOrder,
    name,
    description,
  })
}
