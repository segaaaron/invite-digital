export type IdentityErrorKind =
  | 'invalid_email'
  /** El correo ya es de otra cuenta. */
  | 'email_taken'
  | 'weak_password'
  | 'invalid_credentials'
  | 'session_expired'
  | 'too_many_attempts'
  | 'storage_failure'

export type IdentityError = { readonly kind: IdentityErrorKind; readonly detail: string }

export const identityError = (kind: IdentityErrorKind, detail: string): IdentityError => ({ kind, detail })
