import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { PlanInput } from '../domain/plan'
import { listPlans } from './list-plans'
import type { PlanRepository } from './ports'

const row: PlanInput = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'atelier',
  priceCents: 69000,
  highlighted: false,
  sortOrder: 1,
  name: 'Atelier',
  tagline: 'Esencia elegante',
  description: 'Una escena.',
  features: ['Sobre animado'],
}

const repositoryOf = (rows: PlanInput[]): PlanRepository => ({
  listActive: async () => rows,
})

describe('listPlans', () => {
  it('devuelve los planes ordenados por sortOrder', async () => {
    const second: PlanInput = { ...row, id: '22222222-2222-2222-2222-222222222222', slug: 'firma-3d', sortOrder: 2 }
    const result = await listPlans({ plans: repositoryOf([second, row]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.map((p) => p.slug)).toEqual(['atelier', 'firma-3d'])
  })

  it('falla si un plan de la base es inválido', async () => {
    const result = await listPlans({ plans: repositoryOf([{ ...row, priceCents: 0 }]) })('es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_price')
  })

  it('devuelve lista vacía sin planes', async () => {
    const result = await listPlans({ plans: repositoryOf([]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })
})
