export type RemindersErrorKind = 'not_found' | 'storage_failure'

export type RemindersError = {
  readonly kind: RemindersErrorKind
  readonly detail: string
}

export function remindersError(kind: RemindersErrorKind, detail: string): RemindersError {
  return { kind, detail }
}
