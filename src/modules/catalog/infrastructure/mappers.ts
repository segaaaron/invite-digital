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
