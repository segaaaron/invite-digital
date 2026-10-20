export type RsvpErrorKind =
  | 'invitation_not_found'
  | 'invitation_revoked'
  /** La demo de un día venció: existió, caducó, y al cliente se le ofrece la suya (0099). */
  | 'demo_expired'
  | 'rsvp_closed'
  /** Ese grupo ya contestó: se responde una sola vez, y corregir lo reabre el atelier. */
  | 'already_answered'
  | 'too_many_seats'
  | 'invalid_payload'
  | 'storage_failure'
  | 'rate_limited'

export type RsvpError = { readonly kind: RsvpErrorKind; readonly detail: string }

export const rsvpError = (kind: RsvpErrorKind, detail: string): RsvpError => ({ kind, detail })
