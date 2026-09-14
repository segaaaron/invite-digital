import { describe, expect, it } from 'vitest'
import { buildWhatsAppLink, fillPlanMessage, whatsAppToCustomer } from './whatsapp-link'

describe('buildWhatsAppLink', () => {
  it('usa el número configurado en «La web», sin signos', () => {
    expect(buildWhatsAppLink('+59170012345', 'Hola')).toBe('https://wa.me/59170012345?text=Hola')
  })

  it('sin número configurado no hay enlace', () => {
    expect(buildWhatsAppLink('', 'Hola')).toBeNull()
  })

  it('codifica caracteres especiales', () => {
    const link = buildWhatsAppLink('+59170012345', 'Plan Firma 3D — Bs 1.450')
    expect(link).toContain('Plan%20Firma%203D')
    expect(link).not.toContain(' ')
  })
})

describe('fillPlanMessage', () => {
  it('sustituye el plan y el precio en la plantilla', () => {
    expect(fillPlanMessage('Quiero {plan} ({precio})', { name: 'Firma 3D', price: 'Bs 1.450' })).toBe('Quiero Firma 3D (Bs 1.450)')
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
