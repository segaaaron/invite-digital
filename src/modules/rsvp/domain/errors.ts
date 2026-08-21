export type RsvpErrorKind =
  | 'invitation_not_found'
  | 'invitation_revoked'
  | 'rsvp_closed'
  | 'too_many_seats'
  | 'invalid_payload'
  | 'storage_failure'
  | 'rate_limited'

export type RsvpError = { readonly kind: RsvpErrorKind; readonly detail: string }

export const rsvpError = (kind: RsvpErrorKind, detail: string): RsvpError => ({ kind, detail })
