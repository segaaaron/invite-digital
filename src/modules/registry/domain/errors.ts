export type RegistryErrorKind =
  | 'invalid_amount'
  | 'invalid_name'
  | 'invalid_url'
  | 'already_claimed'
  | 'not_yours'
  | 'already_purchased'
  | 'wrong_event'
  | 'not_found'
  | 'invalid_gift_ways'
  | 'storage_failure'

export type RegistryError = { readonly kind: RegistryErrorKind; readonly detail: string }

export const registryError = (kind: RegistryErrorKind, detail: string): RegistryError => ({ kind, detail })
