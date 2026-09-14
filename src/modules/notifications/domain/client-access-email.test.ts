import { describe, expect, it } from 'vitest'
import { clientAccessEmail } from './client-access-email'

const BASE = {
  email: 'novios@ejemplo.bo',
  password: 'una-contrasena-larga',
  eventTitle: 'Boda de Ana y Beto',
  panelUrl: 'https://luxuryatelier.net/panel/entrar',
  whatsapp: '+59170000000',
}

describe('clientAccessEmail', () => {
  it('lleva el acceso: enlace, usuario y contraseña', () => {
    const correo = clientAccessEmail(BASE)

    expect(correo.subject).toContain('Boda de Ana y Beto')
    expect(correo.text).toContain('https://luxuryatelier.net/panel/entrar')
    expect(correo.text).toContain('novios@ejemplo.bo')
    expect(correo.text).toContain('una-contrasena-larga')
  })

  it('sin contraseña no se inventa ninguna: dice que use la suya', () => {
    // Es el caso del correo que ya tenía cuenta. Mandarle una contraseña que no funciona
    // sería peor que no mandar nada: la probaría, fallaría y llamaría.
    const correo = clientAccessEmail({ ...BASE, password: null })

    expect(correo.text).toContain('la contraseña que ya usabas')
    expect(correo.text).not.toContain('Contraseña:')
  })

  it('avisa de que el buzón no atiende respuestas', () => {
    expect(clientAccessEmail(BASE).text).toContain('no atiende respuestas')
  })

  it('y dice a dónde escribir de verdad, si hay teléfono', () => {
    expect(clientAccessEmail(BASE).text).toContain('+59170000000')
    expect(clientAccessEmail({ ...BASE, whatsapp: null }).text).not.toContain('Dudas:')
  })

  it('escapa lo que va al HTML', () => {
    // El título del evento lo escribe el atelier y acaba dentro de una etiqueta.
    const correo = clientAccessEmail({ ...BASE, eventTitle: 'Boda <script>alert(1)</script>' })

    expect(correo.html).not.toContain('<script>')
    expect(correo.html).toContain('&lt;script&gt;')
  })
})
