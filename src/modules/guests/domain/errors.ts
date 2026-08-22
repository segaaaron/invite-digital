export type GuestErrorKind =
  | 'invalid_label'
  | 'invalid_seats'
  | 'not_found'
  | 'revoked'
  // El plan del evento no admite más grupos. Es un error de `guests` y no de `plans`
  // porque quien lo produce es el alta: la capacidad llega ya resuelta como argumento.
  | 'plan_limit_reached'
  | 'storage_failure'

export type GuestError = { readonly kind: GuestErrorKind; readonly detail: string }

export const guestError = (kind: GuestErrorKind, detail: string): GuestError => ({ kind, detail })
