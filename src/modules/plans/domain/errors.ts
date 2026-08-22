export type PlansErrorKind =
  | 'plan_limit_reached'
  | 'feature_not_included'
  | 'request_already_pending'
  | 'same_plan'
  | 'already_resolved'
  | 'not_found'
  | 'storage_failure'

export type PlansError = { readonly kind: PlansErrorKind; readonly detail: string }

export const plansError = (kind: PlansErrorKind, detail: string): PlansError => ({ kind, detail })
