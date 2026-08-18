export type CatalogErrorKind = 'invalid_price' | 'invalid_slug' | 'empty_features' | 'not_found'

export type CatalogError = { readonly kind: CatalogErrorKind; readonly detail: string }

export const catalogError = (kind: CatalogErrorKind, detail: string): CatalogError => ({ kind, detail })
