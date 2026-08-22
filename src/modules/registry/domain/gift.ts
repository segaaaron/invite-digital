import { err, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from './errors'
import { MAX_AMOUNT_CENTS } from './money'

export const GIFT_STATUSES = ['available', 'reserved', 'purchased'] as const
export type GiftStatus = (typeof GIFT_STATUSES)[number]

export type Gift = {
  readonly id: string
  readonly eventId: string
  readonly name: string
  readonly priceCents: number
  readonly store: string | null
  readonly url: string | null
  readonly status: GiftStatus
  readonly claimedByGroupId: string | null
  readonly claimedAt: Date | null
}

export type GiftDraft = {
  id: string
  eventId: string
  name: string
  priceCents: number
  store: string | null
  url: string | null
}

/**
 * Solo `http` y `https`. Este enlace acaba siendo un `<a href>` que el invitado pulsa
 * desde su invitación: un `javascript:` escrito aquí sería un agujero abierto por el
 * propio panel, y `data:` permitiría servir una página entera desde el atributo.
 *
 * La comprobación va con el constructor de `URL`, no con una expresión regular: el
 * navegador resuelve el esquema con las mismas reglas, y una regexp propia siempre deja
 * fuera alguna forma —espacios delante, mayúsculas, tabuladores en medio.
 */
const ALLOWED_PROTOCOLS: readonly string[] = ['http:', 'https:']

const normalizeUrl = (raw: string | null): Result<string | null, RegistryError> => {
  const text = (raw ?? '').trim()
  if (text.length === 0) return ok(null)

  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    return err(registryError('invalid_url', `«${text}» no es una dirección web. Empieza por https://`))
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol.toLowerCase())) {
    return err(registryError('invalid_url', `Solo se admiten enlaces http o https, no «${parsed.protocol}»`))
  }

  return ok(text)
}

const normalizeStore = (raw: string | null): string | null => {
  const text = (raw ?? '').trim()
  return text.length === 0 ? null : text
}

export function createGift(draft: GiftDraft): Result<Gift, RegistryError> {
  const name = draft.name.trim()
  if (name.length === 0 || name.length > 160) {
    return err(registryError('invalid_name', 'El nombre del regalo va de 1 a 160 caracteres.'))
  }

  if (!Number.isInteger(draft.priceCents) || draft.priceCents <= 0 || draft.priceCents > MAX_AMOUNT_CENTS) {
    return err(registryError('invalid_amount', 'El precio va en centavos enteros y mayor que cero.'))
  }

  const url = normalizeUrl(draft.url)
  if (!url.ok) return url

  return ok({
    id: draft.id,
    eventId: draft.eventId,
    name,
    priceCents: draft.priceCents,
    store: normalizeStore(draft.store),
    url: url.value,
    status: 'available',
    claimedByGroupId: null,
    claimedAt: null,
  })
}
