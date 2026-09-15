import { describe, expect, it } from 'vitest'
import { supportAccessEmail } from './support-access-email'

const BASE = {
  eventTitle: 'Boda de Ana y Beto',
  motivo: 'La lista de invitados no carga <b>',
  hora: '15 de septiembre, 15:40',
  whatsapp: '+59170000000',
  siteUrl: 'https://luxuryatelier.net',
}

describe('supportAccessEmail', () => {
  it('le dice al cliente que el equipo entró a su panel, cuándo y por qué', () => {
    const correo = supportAccessEmail(BASE)
    expect(correo.subject).toContain('Boda de Ana y Beto')
    expect(correo.text).toContain('La lista de invitados no carga')
    expect(correo.text).toContain('15 de septiembre, 15:40')
  })

  it('no lleva ningún enlace al panel: es un aviso, no una puerta', () => {
    const correo = supportAccessEmail(BASE)
    expect(correo.text).not.toContain('/panel')
    expect(correo.html).not.toContain('/panel')
  })

  it('escapa el motivo en el HTML: lo escribe una persona', () => {
    expect(supportAccessEmail(BASE).html).toContain('&lt;b&gt;')
  })
})
