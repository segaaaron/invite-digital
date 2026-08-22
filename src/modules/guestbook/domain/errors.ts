export type GuestbookErrorKind = 'invalid_reply' | 'wrong_event' | 'not_found' | 'storage_failure'

export type GuestbookError = { readonly kind: GuestbookErrorKind; readonly detail: string }

export const guestbookError = (kind: GuestbookErrorKind, detail: string): GuestbookError => ({ kind, detail })
