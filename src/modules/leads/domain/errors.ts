export type LeadErrorKind =
  | 'invalid_name'
  | 'missing_contact'
  | 'invalid_email'
  | 'past_event_date'
  | 'invalid_payload'
  | 'rate_limited'
  | 'storage_failure'

export type LeadError = { readonly kind: LeadErrorKind; readonly detail: string }

export const leadError = (kind: LeadErrorKind, detail: string): LeadError => ({ kind, detail })
