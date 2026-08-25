export type AdminErrorKind =
  | 'not_found'
  | 'invalid_input'
  | 'forbidden'
  | 'has_events'
  | 'last_admin'
  | 'self'
  | 'duplicate_email'
  | 'storage_failure'

export type AdminError = { readonly kind: AdminErrorKind; readonly detail: string }

export const adminError = (kind: AdminErrorKind, detail: string): AdminError => ({ kind, detail })
