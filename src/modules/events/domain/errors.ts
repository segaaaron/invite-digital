export type EventErrorKind =
  | 'invalid_slug'
  | 'invalid_title'
  | 'invalid_date'
  | 'deadline_after_event'
  | 'invalid_locale'
  | 'invalid_status'
  | 'invalid_theme'
  | 'invalid_retention'
  | 'duplicate_slug'
  | 'not_found'
  | 'storage_failure'

export type EventError = { readonly kind: EventErrorKind; readonly detail: string }

export const eventError = (kind: EventErrorKind, detail: string): EventError => ({ kind, detail })
