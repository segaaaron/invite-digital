export type OrdersErrorKind =
  | 'not_found'
  | 'invalid_input'
  | 'proof_rejected'
  | 'wrong_status'
  | 'rate_limited'
  | 'storage_failure'

export type OrdersError = { readonly kind: OrdersErrorKind; readonly detail: string }

export const ordersError = (kind: OrdersErrorKind, detail: string): OrdersError => ({ kind, detail })
