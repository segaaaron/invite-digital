import { describe, expect, it } from 'vitest'
import { EMPTY_PAYMENT_SETTINGS, isPayable, type PaymentSettings } from './payment-settings'

const completos: PaymentSettings = {
  bank: 'Banco Nacional',
  accountHolder: 'Atelier SRL',
  accountNumber: '1234567890',
  notes: '',
  hasQrImage: true,
}

describe('isPayable', () => {
  it('con banco, titular y cuenta se puede transferir', () => {
    expect(isPayable(completos)).toBe(true)
  })

  it('sin ninguno de los tres, no', () => {
    expect(isPayable(EMPTY_PAYMENT_SETTINGS)).toBe(false)
  })

  it('media ficha tampoco vale', () => {
    // Es peor que ninguna: quien la ve cree que puede pagar y descubre que no cuando ya
    // escribió al atelier.
    expect(isPayable({ ...completos, accountNumber: '' })).toBe(false)
    expect(isPayable({ ...completos, bank: '   ' })).toBe(false)
  })

  it('el QR no sustituye a los datos escritos', () => {
    // Quien paga desde la computadora no puede escanear su propia pantalla.
    expect(isPayable({ ...EMPTY_PAYMENT_SETTINGS, hasQrImage: true })).toBe(false)
  })
})
