import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createPlan } from './plan'

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'firma-3d',
  priceCents: 145000,
  highlighted: true,
  sortOrder: 2,
  name: 'Firma 3D',
  tagline: 'La experiencia completa',
  description: 'Unboxing 3D completo.',
  features: ['Todo lo de Atelier', 'Apertura de sobre en 3D real'],
}

describe('createPlan', () => {
  it('construye un plan válido', () => {
    const result = createPlan(base)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.price.cents).toBe(145000)
      expect(result.value.features).toHaveLength(2)
    }
  })

  it('rechaza un slug vacío', () => {
    const result = createPlan({ ...base, slug: '  ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_slug')
  })

  it('rechaza un plan sin características', () => {
    const result = createPlan({ ...base, features: [] })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('empty_features')
  })

  it('propaga el error del precio', () => {
    const result = createPlan({ ...base, priceCents: -5 })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_price')
  })
})
