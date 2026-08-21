export type CheckinErrorKind =
  | 'malformed_pass'
  | 'invalid_count'
  | 'unknown_pass'
  | 'wrong_event'
  | 'revoked'
  | 'not_found'
  | 'storage_failure'

export type CheckinError = { readonly kind: CheckinErrorKind; readonly detail: string }

export const checkinError = (kind: CheckinErrorKind, detail: string): CheckinError => ({ kind, detail })
