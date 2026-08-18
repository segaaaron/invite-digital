import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createMoney, formatMoney } from './money'

describe('Money', () => {
  it('acepta un monto positivo', () => {
    const result = createMoney(69000)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.cents).toBe(69000)
  })

  it('rechaza montos cero o negativos', () => {
    expect(isErr(createMoney(0))).toBe(true)
    expect(isErr(createMoney(-1))).toBe(true)
  })

  it('rechaza montos no enteros', () => {
    const result = createMoney(690.5)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_price')
  })

  it('formatea en español sin decimales', () => {
    const result = createMoney(69000)
    if (!isOk(result)) throw new Error('esperaba un monto válido')
    expect(formatMoney(result.value, 'es')).toBe('Bs 690')
  })

  it('formatea en inglés con el mismo símbolo local', () => {
    const result = createMoney(145000)
    if (!isOk(result)) throw new Error('esperaba un monto válido')
    expect(formatMoney(result.value, 'en')).toBe('Bs 1,450')
  })

  it('formatea en español el plan Firma 3D (145000 centavos) con el separador real de es-BO', () => {
    const result = createMoney(145000)
    if (!isOk(result)) throw new Error('esperaba un monto válido')
    expect(formatMoney(result.value, 'es')).toBe('Bs 1.450')
  })

  it('formatea en español el plan Alta Costura (290000 centavos) con el separador real de es-BO', () => {
    const result = createMoney(290000)
    if (!isOk(result)) throw new Error('esperaba un monto válido')
    expect(formatMoney(result.value, 'es')).toBe('Bs 2.900')
  })
})
