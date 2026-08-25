import { describe, expect, it } from 'vitest'
import { PUBLIC_REF_ALPHABET, PUBLIC_REF_LENGTH, canDecide, canReceiveProof, newPublicRef, normalizeRef } from './order'

describe('newPublicRef', () => {
  it('no usa caracteres que se confunden al dictarla por teléfono', () => {
    // Cien referencias: con 0/O/1/I/L dentro, una de ellas los sacaría.
    for (let i = 0; i < 100; i += 1) {
      const ref = newPublicRef()

      expect(ref).toHaveLength(PUBLIC_REF_LENGTH)
      expect(ref).toMatch(new RegExp(`^[${PUBLIC_REF_ALPHABET}]+$`))
      expect(ref).not.toMatch(/[0O1IL]/)
    }
  })

  it('no es correlativa: dos seguidas no se parecen', () => {
    const refs = new Set(Array.from({ length: 200 }, () => newPublicRef()))

    // Una referencia correlativa daría colisiones sistemáticas aquí, y además dejaría
    // adivinar el pedido del vecino.
    expect(refs.size).toBe(200)
  })
})

describe('normalizeRef', () => {
  it('acepta lo que un humano teclea: minúsculas y espacios', () => {
    expect(normalizeRef(' k7fh 29zq ')).toBe('K7FH29ZQ')
  })

  it('lo que no cabe en el alfabeto no es una referencia', () => {
    expect(normalizeRef('K7FH-29ZQ')).toBeNull()
    expect(normalizeRef('corto')).toBeNull()
    expect(normalizeRef('')).toBeNull()
  })
})

describe('canReceiveProof', () => {
  it('acepta comprobante mientras se espera el pago', () => {
    expect(canReceiveProof('pending_payment')).toBe(true)
  })

  it('acepta otro comprobante después de un rechazo: rechazar no es el final', () => {
    // Rechazar con nota y obligar a abrir un pedido nuevo perdería el hilo entero.
    expect(canReceiveProof('rejected')).toBe(true)
  })

  it('acepta reemplazar el comprobante mientras nadie lo ha mirado', () => {
    expect(canReceiveProof('proof_submitted')).toBe(true)
  })

  it('un pedido aprobado no admite más comprobantes', () => {
    expect(canReceiveProof('approved')).toBe(false)
  })
})

describe('canDecide', () => {
  it('solo se decide sobre un comprobante presentado', () => {
    expect(canDecide('proof_submitted')).toBe(true)
    expect(canDecide('pending_payment')).toBe(false)
  })

  it('lo aprobado no se vuelve a decidir', () => {
    expect(canDecide('approved')).toBe(false)
  })

  it('lo rechazado tampoco, hasta que llegue otro comprobante', () => {
    expect(canDecide('rejected')).toBe(false)
  })
})
