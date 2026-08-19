export type GuestErrorKind = 'invalid_label' | 'invalid_seats' | 'not_found' | 'revoked' | 'storage_failure'

export type GuestError = { readonly kind: GuestErrorKind; readonly detail: string }

export const guestError = (kind: GuestErrorKind, detail: string): GuestError => ({ kind, detail })
