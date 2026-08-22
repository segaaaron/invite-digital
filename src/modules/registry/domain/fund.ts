import { err, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from './errors'
import { MAX_AMOUNT_CENTS } from './money'

export const CONTRIBUTION_METHODS = ['transfer', 'card', 'envelope', 'other'] as const
export type ContributionMethod = (typeof CONTRIBUTION_METHODS)[number]

export type Fund = {
  readonly id: string
  readonly eventId: string
  readonly name: string
  readonly description: string | null
  readonly goalCents: number
}

/**
 * `guestGroupId` es anulable a propósito: la abuela que entrega un sobre el día del
 * evento no tiene grupo con enlace, y su aportación cuenta igual. `displayName`, en
 * cambio, siempre está: un importe sin remitente no se puede agradecer.
 */
export type Contribution = {
  readonly id: string
  readonly fundId: string
  readonly guestGroupId: string | null
  readonly displayName: string
  readonly amountCents: number
  readonly method: ContributionMethod
  readonly message: string | null
  readonly createdAt: Date
}

export type FundDraft = { id: string; eventId: string; name: string; description: string | null; goalCents: number }

export type ContributionDraft = {
  id: string
  fundId: string
  guestGroupId: string | null
  displayName: string
  amountCents: number
  method: ContributionMethod
  message: string | null
  createdAt: Date
}

const trimmedOrNull = (raw: string | null): string | null => {
  const text = (raw ?? '').trim()
  return text.length === 0 ? null : text
}

const validAmount = (cents: number): boolean => Number.isInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS

export function createFund(draft: FundDraft): Result<Fund, RegistryError> {
  const name = draft.name.trim()
  if (name.length === 0 || name.length > 160) {
    return err(registryError('invalid_name', 'El nombre del fondo va de 1 a 160 caracteres.'))
  }

  if (!validAmount(draft.goalCents)) {
    return err(registryError('invalid_amount', 'La meta va en centavos enteros y mayor que cero.'))
  }

  return ok({
    id: draft.id,
    eventId: draft.eventId,
    name,
    description: trimmedOrNull(draft.description),
    goalCents: draft.goalCents,
  })
}

export function createContribution(draft: ContributionDraft): Result<Contribution, RegistryError> {
  const displayName = draft.displayName.trim()
  if (displayName.length === 0 || displayName.length > 160) {
    return err(registryError('invalid_name', 'Escribe de quién viene la aportación, de 1 a 160 caracteres.'))
  }

  if (!validAmount(draft.amountCents)) {
    return err(registryError('invalid_amount', 'El importe va en centavos enteros y mayor que cero.'))
  }

  if (!(CONTRIBUTION_METHODS as readonly string[]).includes(draft.method)) {
    return err(registryError('invalid_name', `Forma de pago desconocida: ${draft.method}`))
  }

  return ok({
    id: draft.id,
    fundId: draft.fundId,
    guestGroupId: draft.guestGroupId,
    displayName,
    amountCents: draft.amountCents,
    method: draft.method,
    message: trimmedOrNull(draft.message),
    createdAt: draft.createdAt,
  })
}
