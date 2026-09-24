import { describe, expect, it } from 'vitest'
import { rsvpHostEmail } from './rsvp-host-email'

const BASE = { invitado: 'Ana Rojas', mensaje: null, evento: 'Boda de Ana y Luis', enlace: 'https://luxuryatelier.net/panel/eventos/boda/invitados', siteUrl: 'https://luxuryatelier.net' }

describe('rsvpHostEmail', () => {
  it('dice quién confirmó y cuántos, y lleva a la lista', () => {
    const correo = rsvpHostEmail({ ...BASE, asistentes: 3 })
    expect(correo.subject).toBe('Ana Rojas confirmó · 3 personas — Boda de Ana y Luis')
    expect(correo.text).toContain(BASE.enlace)
    expect(rsvpHostEmail({ ...BASE, asistentes: 1 }).subject).toContain('1 persona —')
  })

  it('con cero, dice que no podrá asistir', () => {
    expect(rsvpHostEmail({ ...BASE, asistentes: 0 }).subject).toBe('Ana Rojas no podrá asistir — Boda de Ana y Luis')
  })

  it('lleva su mensaje, escapado: lo escribió el invitado', () => {
    const correo = rsvpHostEmail({ ...BASE, asistentes: 2, mensaje: '¡Felicidades! <b>' })
    expect(correo.text).toContain('«¡Felicidades! <b>»')
    expect(correo.html).toContain('&lt;b&gt;')
    expect(correo.html).not.toContain('<b>»')
  })
})
