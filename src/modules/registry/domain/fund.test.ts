import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { RegistryErrorKind } from './errors'
import { type ContributionDraft, createContribution, createFund, type FundDraft } from './fund'

const fondo: FundDraft = {
  id: 'f1',
  eventId: 'e1',
  name: 'Luna de miel',
  description: '  Para los pasajes.  ',
  goalCents: 100_000,
}

const aporte: ContributionDraft = {
  id: 'c1',
  fundId: 'f1',
  guestGroupId: null,
  displayName: '  Abuela Rosa  ',
  amountCents: 15_000,
  method: 'envelope',
  message: '  Que sean muy felices.  ',
  createdAt: new Date('2026-08-20T10:00:00.000Z'),
}

const fallaFondo = (draft: FundDraft, kind: RegistryErrorKind) => {
  const result = createFund(draft)
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero el fondo se creó`)
  expect(result.error.kind).toBe(kind)
}

const fallaAporte = (draft: ContributionDraft, kind: RegistryErrorKind) => {
  const result = createContribution(draft)
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero la aportación se creó`)
  expect(result.error.kind).toBe(kind)
}

const valorFondo = (draft: FundDraft) => {
  const result = createFund(draft)
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}`)
  return result.value
}

const valorAporte = (draft: ContributionDraft) => {
  const result = createContribution(draft)
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}`)
  return result.value
}

describe('createFund', () => {
  it('recorta el nombre y la descripción', () => {
    const f = valorFondo({ ...fondo, name: '  Luna de miel  ' })
    expect(f.name).toBe('Luna de miel')
    expect(f.description).toBe('Para los pasajes.')
  })

  it('la descripción vacía es null, no una cadena en blanco', () => {
    expect(valorFondo({ ...fondo, description: '   ' }).description).toBeNull()
    expect(valorFondo({ ...fondo, description: null }).description).toBeNull()
  })

  it('rechaza el nombre vacío o demasiado largo', () => {
    fallaFondo({ ...fondo, name: '  ' }, 'invalid_name')
    fallaFondo({ ...fondo, name: 'x'.repeat(161) }, 'invalid_name')
  })

  it('rechaza una meta de cero, negativa o con decimales sueltos', () => {
    fallaFondo({ ...fondo, goalCents: 0 }, 'invalid_amount')
    fallaFondo({ ...fondo, goalCents: -1 }, 'invalid_amount')
    fallaFondo({ ...fondo, goalCents: 10.5 }, 'invalid_amount')
  })
})

describe('createContribution', () => {
  it('recorta el nombre y el mensaje', () => {
    const c = valorAporte(aporte)
    expect(c.displayName).toBe('Abuela Rosa')
    expect(c.message).toBe('Que sean muy felices.')
  })

  it('acepta una aportación sin grupo: la abuela del sobre no tiene enlace', () => {
    expect(valorAporte({ ...aporte, guestGroupId: null }).guestGroupId).toBeNull()
  })

  it('conserva el grupo cuando quien aporta sí es un invitado con enlace', () => {
    expect(valorAporte({ ...aporte, guestGroupId: 'grupo-ana' }).guestGroupId).toBe('grupo-ana')
  })

  it('rechaza una aportación sin remitente: un importe sin nombre no se agradece', () => {
    fallaAporte({ ...aporte, displayName: '   ' }, 'invalid_name')
  })

  it('rechaza importes de cero o negativos', () => {
    fallaAporte({ ...aporte, amountCents: 0 }, 'invalid_amount')
    fallaAporte({ ...aporte, amountCents: -500 }, 'invalid_amount')
  })

  it('acepta las cuatro formas de pago previstas', () => {
    for (const method of ['transfer', 'card', 'envelope', 'other'] as const) {
      expect(valorAporte({ ...aporte, method }).method).toBe(method)
    }
  })
})
