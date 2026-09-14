import { describe, expect, it } from 'vitest'
import { buildWhatsAppLink, whatsAppPlanMessage, whatsAppToCustomer } from './whatsapp-link'

describe('buildWhatsAppLink', () => {
  it('usa el número de marca sin signos', () => {
    expect(buildWhatsAppLink({ message: 'Hola' })).toBe('https://wa.me/59170012345?text=Hola')
  })

  it('codifica caracteres especiales', () => {
    const link = buildWhatsAppLink({ message: 'Plan Firma 3D — Bs 1.450' })
    expect(link).toContain('Plan%20Firma%203D')
    expect(link).not.toContain(' ')
  })
})

describe('whatsAppPlanMessage', () => {
  it('menciona el plan y el precio en español', () => {
    const message = whatsAppPlanMessage({ name: 'Firma 3D', price: 'Bs 1.450' }, 'es')
    expect(message).toContain('Firma 3D')
    expect(message).toContain('Bs 1.450')
  })

  it('cambia el idioma del mensaje', () => {
    expect(whatsAppPlanMessage({ name: 'Signature 3D', price: 'Bs 1,450' }, 'en')).toMatch(/^Hello/)
  })
})

describe('whatsAppToCustomer', () => {
  it('usa el número con su prefijo tal cual', () => {
    expect(whatsAppToCustomer('+59170011223', 'hola')).toBe('https://wa.me/59170011223?text=hola')
  })

  it('completa con 591 un celular boliviano escrito sin prefijo', () => {
    expect(whatsAppToCustomer('700 11223', 'hola')).toBe('https://wa.me/59170011223?text=hola')
  })

  it('sin teléfono no hay enlace', () => {
    expect(whatsAppToCustomer(null, 'hola')).toBe(null)
    expect(whatsAppToCustomer('--', 'hola')).toBe(null)
  })
})
