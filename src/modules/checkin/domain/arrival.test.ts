import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { MAX_EXTRA_ARRIVALS, createArrival, isLive, unlistedOf } from './arrival'

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

  it('admite alguno más que cupos: el acompañante que aparece sin avisar', () => {
    // Esta prueba decía lo contrario hasta que la puerta pidió registrar a quien llega
    // sin estar en la lista. El tope sigue existiendo, más arriba.
    expect(isOk(createArrival({ ...base, arrivedCount: 5 }, 4))).toBe(true)
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

describe('acompañantes no invitados', () => {
  const base = {
    scanId: crypto.randomUUID(),
    guestGroupId: crypto.randomUUID(),
    scannedAt: new Date('2026-10-18T22:00:00Z'),
    voidedAt: null,
  }

  it('admite entrar de más: en una boda aparece gente que nadie anotó', () => {
    // Negarlo deja al catering contando mal, que es peor que el registro impreciso.
    expect(isOk(createArrival({ ...base, arrivedCount: 6 }, 4))).toBe(true)
  })

  it('pero no una lista paralela: hay un tope', () => {
    expect(isErr(createArrival({ ...base, arrivedCount: 4 + MAX_EXTRA_ARRIVALS + 1 }, 4))).toBe(true)
  })

  it('dice cuántos entraron sin invitación', () => {
    const llegada = createArrival({ ...base, arrivedCount: 6 }, 4)

    expect(isOk(llegada) && unlistedOf(llegada.value, 4)).toBe(2)
  })

  it('y cero cuando cabían todos', () => {
    const llegada = createArrival({ ...base, arrivedCount: 3 }, 4)

    expect(isOk(llegada) && unlistedOf(llegada.value, 4)).toBe(0)
  })
})
