import { err, ok, type Result } from '@/shared/result'
import { catalogError, type CatalogError } from './errors'

export type CategoryInput = {
  slug: string
  name: string
  sortOrder: number
}

export type Category = {
  readonly slug: string
  readonly name: string
  readonly sortOrder: number
}

/**
 * Lo que hoy se vende, y por tanto lo único que ofrece el formulario de contacto: bodas y XV
 * años. Las demás categorías siguen en la base —hay consultas antiguas que las nombran— pero
 * ofrecerlas sería vender un catálogo que no existe.
 */
export const CATEGORIAS_A_LA_VENTA: readonly string[] = ['boda', 'xv-anos']

/** Las categorías que se ofrecen, en el orden del catálogo. */
export const aLaVenta = (categorias: readonly Category[]): readonly Category[] =>
  categorias.filter((c) => CATEGORIAS_A_LA_VENTA.includes(c.slug))

export function createCategory(input: CategoryInput): Result<Category, CatalogError> {
  const slug = input.slug.trim()
  if (slug.length === 0) return err(catalogError('invalid_slug', 'La categoría no tiene slug'))

  const name = input.name.trim()
  if (name.length === 0) return err(catalogError('invalid_name', `La categoría ${slug} no tiene nombre`))

  if (!Number.isInteger(input.sortOrder)) {
    return err(catalogError('invalid_sort_order', `sortOrder inválido en la categoría ${slug}`))
  }

  return ok({ slug, name, sortOrder: input.sortOrder })
}
