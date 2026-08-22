import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { RegistryErrorKind } from './errors'
import { createGift, type GiftDraft } from './gift'

const base: GiftDraft = {
  id: 'g1',
  eventId: 'e1',
  name: 'Cafetera italiana',
  priceCents: 45000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/cafetera',
}

const falla = (draft: GiftDraft, kind: RegistryErrorKind) => {
  const result = createGift(draft)
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero el regalo se creó`)
  expect(result.error.kind).toBe(kind)
}

const valor = (draft: GiftDraft) => {
  const result = createGift(draft)
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}: ${result.error.detail}`)
  return result.value
}

describe('createGift', () => {
  it('nace disponible y sin dueño', () => {
    const g = valor(base)
    expect(g.status).toBe('available')
    expect(g.claimedByGroupId).toBeNull()
    expect(g.claimedAt).toBeNull()
  })

  it('recorta el nombre y la tienda', () => {
    const g = valor({ ...base, name: '  Cafetera  ', store: '  Casa Ideal  ' })
    expect(g.name).toBe('Cafetera')
    expect(g.store).toBe('Casa Ideal')
  })

  it('la tienda vacía es null, no una cadena en blanco', () => {
    expect(valor({ ...base, store: '   ' }).store).toBeNull()
    expect(valor({ ...base, store: null }).store).toBeNull()
  })

  it('rechaza el nombre vacío', () => {
    falla({ ...base, name: '   ' }, 'invalid_name')
  })

  it('rechaza el nombre de más de 160 caracteres, que es lo que aguanta la columna', () => {
    falla({ ...base, name: 'x'.repeat(161) }, 'invalid_name')
  })

  it('rechaza precios que no sean enteros positivos en centavos', () => {
    falla({ ...base, priceCents: 0 }, 'invalid_amount')
    falla({ ...base, priceCents: -100 }, 'invalid_amount')
    falla({ ...base, priceCents: 45.5 }, 'invalid_amount')
  })

  it('acepta un regalo sin enlace a tienda', () => {
    expect(valor({ ...base, url: null }).url).toBeNull()
    expect(valor({ ...base, url: '  ' }).url).toBeNull()
  })

  it('acepta http y https', () => {
    expect(valor({ ...base, url: 'http://casaideal.bo/x' }).url).toBe('http://casaideal.bo/x')
    expect(valor({ ...base, url: 'https://casaideal.bo/x' }).url).toBe('https://casaideal.bo/x')
  })

  it('rechaza javascript: — el invitado pulsa ese enlace', () => {
    // Un `javascript:` en este campo sería un agujero abierto por el propio panel.
    falla({ ...base, url: 'javascript:alert(1)' }, 'invalid_url')
  })

  it('rechaza cualquier esquema que no sea http o https', () => {
    for (const url of ['data:text/html,<script>', 'file:///etc/passwd', 'ftp://x.bo/a', 'vbscript:msgbox']) {
      falla({ ...base, url }, 'invalid_url')
    }
  })

  it('rechaza lo que ni siquiera es una URL', () => {
    falla({ ...base, url: 'casaideal.bo/cafetera' }, 'invalid_url')
    falla({ ...base, url: '://roto' }, 'invalid_url')
  })

  it('no se deja engañar por mayúsculas ni espacios delante del esquema', () => {
    falla({ ...base, url: '  JavaScript:alert(1)' }, 'invalid_url')
    expect(valor({ ...base, url: '  HTTPS://casaideal.bo/x  ' }).url).toBe('HTTPS://casaideal.bo/x')
  })
})
