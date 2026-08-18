import type { TemplateInput } from '../domain/template'

/**
 * Fila cruda que produce el `select` de `drizzle-template-repository`: columnas propias
 * de `templates` más las traducidas y las de la categoría, ya resueltas por los joins.
 */
export type TemplateRow = {
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

/**
 * Forma real de la fila cuando la traducción de la plantilla y/o de su categoría se
 * unen con LEFT JOIN: `name`, `description` y `categoryName` pueden venir `null` si no
 * existe traducción para el idioma pedido.
 */
export type RawTemplateJoinRow = Omit<TemplateRow, 'categoryName' | 'name' | 'description'> & {
  categoryName: string | null
  name: string | null
  description: string | null
}

// Punto único de traducción entre las columnas de la base y el `TemplateInput` que
// consume el dominio. No valida: la validación ocurre en `createTemplate`, en la capa
// de aplicación.
export const toTemplateInput = (row: TemplateRow): TemplateInput => ({
  id: row.id,
  slug: row.slug,
  categorySlug: row.categorySlug,
  categoryName: row.categoryName,
  coverImagePath: row.coverImagePath,
  palette: { base: row.palette.base, accent: row.palette.accent },
  sortOrder: row.sortOrder,
  name: row.name,
  description: row.description,
})

/**
 * Separa las filas con traducción completa (plantilla y categoría, en el idioma
 * pedido) de las que tienen alguna traducción faltante. Las incompletas nunca se
 * devuelven al dominio a medio construir: se ocultan del catálogo de ese idioma, pero
 * quien llama debe registrarlas con `console.error` para que el hueco de contenido no
 * pase inadvertido — ver comentario en `drizzle-template-repository.ts`.
 */
export const partitionTemplateRows = (
  rows: readonly RawTemplateJoinRow[],
): { complete: TemplateRow[]; missingSlugs: string[] } => {
  const complete: TemplateRow[] = []
  const missingSlugs: string[] = []

  for (const row of rows) {
    if (row.name === null || row.description === null || row.categoryName === null) {
      missingSlugs.push(row.slug)
      continue
    }
    complete.push({ ...row, name: row.name, description: row.description, categoryName: row.categoryName })
  }

  return { complete, missingSlugs }
}
