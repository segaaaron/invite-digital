export type QrErrorKind = 'not_found' | 'invalid_label' | 'invalid_kind' | 'invalid_target' | 'storage_failure'

export type QrError = { readonly kind: QrErrorKind; readonly detail: string }

export const qrError = (kind: QrErrorKind, detail: string): QrError => ({ kind, detail })
