import { describe, expect, it } from 'vitest'
import { adminAlertEmail } from './admin-alert-email'

describe('adminAlertEmail', () => {
  const correo = adminAlertEmail({
    asunto: 'Nuevo comprobante · PED7K3',
    lineas: ['María <b>Rojas</b> subió el comprobante del pedido PED7K3.'],
    enlace: 'https://luxuryatelier.net/panel/pedidos',
    siteUrl: 'https://luxuryatelier.net',
  })

  it('dice qué pasó y lleva a la bandeja', () => {
    expect(correo.subject).toBe('Nuevo comprobante · PED7K3')
    expect(correo.text).toContain('subió el comprobante')
    expect(correo.text).toContain('https://luxuryatelier.net/panel/pedidos')
    expect(correo.html).toContain('href="https://luxuryatelier.net/panel/pedidos"')
  })

  it('escapa lo que escribió el cliente', () => {
    expect(correo.html).toContain('&lt;b&gt;Rojas&lt;/b&gt;')
    expect(correo.html).not.toContain('<b>Rojas')
  })
})
