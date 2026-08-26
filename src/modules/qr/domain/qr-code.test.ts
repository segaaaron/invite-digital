import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { QR_KINDS, createQrCode, internalTarget, qrUrl } from './qr-code'

const base = { id: 'q1', label: 'Mesa de regalos', kind: 'registry' as const, target: '/i/abc', active: true }

describe('createQrCode', () => {
  it('acepta una ruta interna', () => {
    expect(isOk(createQrCode({ ...base, target: '/es/pedido/firma-3d' }))).toBe(true)
  })

  it('acepta http y https', () => {
    expect(isOk(createQrCode({ ...base, target: 'https://tienda.example.com/lista' }))).toBe(true)
    expect(isOk(createQrCode({ ...base, target: 'http://tienda.example.com' }))).toBe(true)
  })

  it('rechaza javascript:, que sería un agujero abierto por el propio panel', () => {
    // El destino acaba siendo un `Location:` que pulsa un invitado. Es la misma regla que
    // ya rige la URL de tienda de la mesa de regalos.
    expect(isErr(createQrCode({ ...base, target: 'javascript:alert(1)' }))).toBe(true)
    expect(isErr(createQrCode({ ...base, target: 'data:text/html,<script>' }))).toBe(true)
  })

  it('rechaza una ruta que no empieza por barra: sería relativa a /r/ y no llevaría a nada', () => {
    expect(isErr(createQrCode({ ...base, target: 'es/pedido' }))).toBe(true)
  })

  it('rechaza «//otro-dominio», que parece interno y no lo es', () => {
    // Empieza por barra, así que la comprobación ingenua lo daría por interno, y el
    // navegador lo lee como protocolo relativo: sale del sitio.
    expect(isErr(createQrCode({ ...base, target: '//evil.example.com' }))).toBe(true)
  })

  it('exige etiqueta: una lista de códigos sin nombre no se puede administrar', () => {
    expect(isErr(createQrCode({ ...base, label: '   ' }))).toBe(true)
  })

  it('recorta la etiqueta y el destino', () => {
    const code = createQrCode({ ...base, label: '  Regalos  ', target: '  /es  ' })

    expect(isOk(code) && code.value.label).toBe('Regalos')
    expect(isOk(code) && code.value.target).toBe('/es')
  })

  it('un tipo desconocido no pasa', () => {
    expect(isErr(createQrCode({ ...base, kind: 'inventado' as never }))).toBe(true)
    expect(QR_KINDS).toContain('registry')
  })
})

describe('qrUrl', () => {
  it('es una dirección nuestra, no la del destino', () => {
    // Ahí está todo el punto del motor: lo impreso apunta a nosotros, así que el destino
    // se puede cambiar después de imprimir.
    expect(qrUrl('q1', 'https://invitepremium.bo')).toBe('https://invitepremium.bo/r/q1')
  })

  it('no duplica la barra si el sitio la trae', () => {
    expect(qrUrl('q1', 'https://invitepremium.bo/')).toBe('https://invitepremium.bo/r/q1')
  })
})

describe('internalTarget', () => {
  it('compone la mesa de regalos de un invitado a partir de su token', () => {
    expect(internalTarget.registry('TOKEN123')).toBe('/i/TOKEN123#regalos')
  })
})
