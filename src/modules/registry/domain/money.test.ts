import { describe, expect, it } from 'vitest'
import { isErr, isOk, type Result } from '@/shared/result'
import type { RegistryError } from './errors'
import { formatAmount, MAX_AMOUNT_CENTS, parseAmount } from './money'

const centavos = (result: Result<number, RegistryError>): number => {
  if (!isOk(result)) throw new Error(`Se esperaba un importe válido, llegó ${result.error.kind}: ${result.error.detail}`)
  return result.value
}

describe('parseAmount', () => {
  it('acepta el formato con coma decimal', () => {
    expect(centavos(parseAmount('1.234,50'))).toBe(123450)
  })

  it('acepta el formato con punto decimal', () => {
    expect(centavos(parseAmount('1234.50'))).toBe(123450)
  })

  it('acepta el formato anglosajón con coma de millar', () => {
    expect(centavos(parseAmount('1,234.50'))).toBe(123450)
  })

  it('acepta un entero', () => {
    expect(centavos(parseAmount('150'))).toBe(15000)
  })

  it('acepta un decimal suelto', () => {
    expect(centavos(parseAmount('0,50'))).toBe(50)
  })

  it('acepta un solo decimal y lo completa a centavos', () => {
    expect(centavos(parseAmount('12,5'))).toBe(1250)
  })

  it('no pierde el céntimo que la coma flotante redondearía', () => {
    // parseFloat('1234.50') * 100 da 123449.99999999999 en algunos motores.
    // Componer el entero desde las cadenas no tiene ese problema.
    expect(centavos(parseAmount('1234.50'))).toBe(123450)
    expect(centavos(parseAmount('0,07'))).toBe(7)
    expect(centavos(parseAmount('8,29'))).toBe(829)
  })

  it('ignora los espacios de alrededor', () => {
    expect(centavos(parseAmount('  150  '))).toBe(15000)
  })

  it('rechaza cero: un regalo de cero no es un regalo', () => {
    expect(isErr(parseAmount('0'))).toBe(true)
    expect(isErr(parseAmount('0,00'))).toBe(true)
  })

  it('rechaza negativos', () => {
    expect(isErr(parseAmount('-10'))).toBe(true)
    expect(isErr(parseAmount('-10,50'))).toBe(true)
  })

  it('rechaza tres decimales', () => {
    expect(isErr(parseAmount('10,555'))).toBe(true)
    expect(isErr(parseAmount('10.555'))).toBe(true)
  })

  it('rechaza texto', () => {
    expect(isErr(parseAmount('mucho dinero'))).toBe(true)
    expect(isErr(parseAmount('150 Bs'))).toBe(true)
  })

  it('rechaza vacío', () => {
    expect(isErr(parseAmount('  '))).toBe(true)
    expect(isErr(parseAmount(''))).toBe(true)
  })

  it('rechaza separadores sueltos o repetidos', () => {
    expect(isErr(parseAmount(','))).toBe(true)
    expect(isErr(parseAmount('1,,50'))).toBe(true)
    expect(isErr(parseAmount('1,50,50'))).toBe(true)
  })

  it('rechaza lo que no cabe en un integer de Postgres', () => {
    // La columna es `integer`: por encima de eso la base rompería con un error de
    // desbordamiento en vez de un mensaje en el formulario.
    expect(centavos(parseAmount('21474836,47'))).toBe(MAX_AMOUNT_CENTS)
    expect(isErr(parseAmount('21474836,48'))).toBe(true)
    expect(isErr(parseAmount('99999999999'))).toBe(true)
  })

  it('el error es invalid_amount, no una excepción', () => {
    const result = parseAmount('mucho dinero')
    if (isOk(result)) throw new Error('debería fallar')
    expect(result.error.kind).toBe('invalid_amount')
  })
})

describe('formatAmount', () => {
  it('formatea en la moneda del evento', () => {
    expect(formatAmount(123450, 'BOB')).toContain('1.234,50')
  })

  it('no pierde céntimos', () => {
    expect(formatAmount(1, 'BOB')).toContain('0,01')
  })

  it('siempre muestra los dos decimales, aunque sean cero', () => {
    expect(formatAmount(15000, 'BOB')).toContain('150,00')
  })

  it('respeta una moneda distinta de la de casa', () => {
    expect(formatAmount(123450, 'USD')).toContain('1.234,50')
  })

  it('formatea el cero sin romperse', () => {
    expect(formatAmount(0, 'BOB')).toContain('0,00')
  })

  it('ida y vuelta: lo que se formatea se vuelve a leer igual', () => {
    for (const cents of [1, 50, 829, 15000, 123450, MAX_AMOUNT_CENTS]) {
      expect(centavos(parseAmount(formatAmount(cents, 'BOB').replace(/[^\d.,]/g, '')))).toBe(cents)
    }
  })
})
