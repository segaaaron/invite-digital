export type VenueErrorKind =
  | 'invalid_capacity'
  | 'invalid_label'
  | 'invalid_kind'
  | 'invalid_size'
  | 'duplicate_label'
  | 'does_not_fit'
  | 'wrong_event'
  | 'not_found'
  | 'storage_failure'

export type VenueError = { readonly kind: VenueErrorKind; readonly detail: string }

export const venueError = (kind: VenueErrorKind, detail: string): VenueError => ({ kind, detail })
