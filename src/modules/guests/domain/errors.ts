export type GuestErrorKind =
  | 'invalid_label'
  | 'invalid_seats'
  | 'not_found'
  | 'revoked'
  /**
   * La invitación es de una **demo de un día** (0099) que ya venció. Se distingue de `not_found` porque el
   * enlace fue bueno y quien lo abre es un posible cliente: la pantalla le ofrece la suya en vez de un 404.
   */
  | 'demo_expired'
  // El plan del evento no admite más grupos. Es un error de `guests` y no de `plans`
  // porque quien lo produce es el alta: la capacidad llega ya resuelta como argumento.
  | 'plan_limit_reached'
  | 'storage_failure'

export type GuestError = { readonly kind: GuestErrorKind; readonly detail: string }

export const guestError = (kind: GuestErrorKind, detail: string): GuestError => ({ kind, detail })
