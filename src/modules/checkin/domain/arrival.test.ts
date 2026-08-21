import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createArrival, isLive } from './arrival'

const base = {
  scanId: '11111111-1111-4111-8111-111111111111',
  guestGroupId: 'g1',
  arrivedCount: 2,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
  voidedAt: null,
}

describe('createArrival', () => {
  it('acepta una llegada dentro de los cupos', () => {
    expect(isOk(createArrival(base, 4))).toBe(true)
  })

  it('acepta que llegue el grupo entero', () => {
    expect(isOk(createArrival({ ...base, arrivedCount: 4 }, 4))).toBe(true)
  })

  it('rechaza cero: un grupo que no entró no se registra', () => {
    const r = createArrival({ ...base, arrivedCount: 0 }, 4)
    expect(isErr(r) && r.error.kind).toBe('invalid_count')
  })

  it('rechaza más personas que cupos', () => {
    expect(isErr(createArrival({ ...base, arrivedCount: 5 }, 4))).toBe(true)
  })

  it('rechaza cantidades fraccionarias o negativas', () => {
    expect(isErr(createArrival({ ...base, arrivedCount: 1.5 }, 4))).toBe(true)
    expect(isErr(createArrival({ ...base, arrivedCount: -1 }, 4))).toBe(true)
  })

  it('una llegada con lápida ya no está viva', () => {
    const r = createArrival({ ...base, voidedAt: new Date() }, 4)
    expect(isOk(r) && isLive(r.value)).toBe(false)
  })

  it('una llegada sin lápida está viva', () => {
    const r = createArrival(base, 4)
    expect(isOk(r) && isLive(r.value)).toBe(true)
  })
})
