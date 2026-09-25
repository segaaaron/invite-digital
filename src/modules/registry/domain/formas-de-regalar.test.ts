import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { hayFormas, leerFormas, SIN_FORMAS } from './formas-de-regalar'

const base = { sobres: false, transferencia: false }

describe('leerFormas', () => {
  it('guarda la transferencia con la cuenta completa, limpiando espacios', () => {
    const r = leerFormas({ ...base, transferencia: true, banco: ' BNB ', titular: 'Ana  Vega', cuenta: '100-2003 4005' }, false)
    expect(isOk(r) && r.value).toMatchObject({ banco: 'BNB', titular: 'Ana Vega', cuenta: '100-2003 4005', transferencia: true })
  })

  it('vale la transferencia solo con el QR del banco', () => {
    expect(isOk(leerFormas({ ...base, transferencia: true }, true))).toBe(true)
  })

  it('no enciende una transferencia sin cuenta ni QR: el invitado no tendría cómo pagar', () => {
    const r = leerFormas({ ...base, transferencia: true }, false)
    expect(isErr(r) && r.error.kind).toBe('invalid_gift_ways')
  })

  it('no acepta media cuenta', () => {
    expect(isErr(leerFormas({ ...base, transferencia: true, banco: 'BNB' }, true))).toBe(true)
  })

  it('corta textos largos y cuentas con caracteres raros', () => {
    expect(isErr(leerFormas({ ...base, sobres: true, sobresTexto: 'x'.repeat(281) }, false))).toBe(true)
    expect(isErr(leerFormas({ ...base, banco: 'BNB', titular: 'Ana', cuenta: '<script>' }, false))).toBe(true)
  })

  it('una frase vacía queda en nulo: se usa la del diseño', () => {
    const r = leerFormas({ ...base, sobres: true, sobresTexto: '   ' }, false)
    expect(isOk(r) && r.value.sobresTexto).toBeNull()
  })
})

describe('hayFormas', () => {
  it('solo con sobres o transferencia encendidos', () => {
    expect(hayFormas(SIN_FORMAS)).toBe(false)
    expect(hayFormas({ ...SIN_FORMAS, sobres: true })).toBe(true)
  })
})
