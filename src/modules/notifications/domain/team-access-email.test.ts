import { describe, expect, it } from 'vitest'
import { teamAccessEmail } from './team-access-email'

const base = { email: 'ana@mail.bo', password: 'Provisional-2026', panelUrl: 'https://x.bo/panel/entrar', whatsapp: null, siteUrl: 'https://x.bo' }

describe('teamAccessEmail', () => {
  it('lleva el enlace, el usuario, la contraseña provisional y el aviso de cambiarla', () => {
    const correo = teamAccessEmail({ ...base, rol: 'admin' })
    for (const trozo of ['https://x.bo/panel/entrar', 'ana@mail.bo', 'Provisional-2026', 'provisional']) {
      expect(correo.text).toContain(trozo)
      expect(correo.html).toContain(trozo)
    }
    expect(correo.text).toContain('administración')
  })

  it('escapa lo que va al HTML', () => {
    const correo = teamAccessEmail({ ...base, rol: 'atelier', password: '<b>&"x"</b>1234' })
    expect(correo.html).toContain('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;1234')
    expect(correo.html).not.toContain('<b>&"x"</b>')
  })
})
