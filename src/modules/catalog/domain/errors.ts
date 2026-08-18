export type CatalogErrorKind =
  | 'invalid_price'
  | 'invalid_slug'
  | 'empty_features'
  | 'not_found'
  | 'invalid_name'
  | 'invalid_image_path'
  | 'invalid_palette'
  | 'invalid_sort_order'

export type CatalogError = { readonly kind: CatalogErrorKind; readonly detail: string }

export const catalogError = (kind: CatalogErrorKind, detail: string): CatalogError => ({ kind, detail })
