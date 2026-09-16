import { describe, expect, it } from 'vitest'
import { renderMessage, whatsappLink } from './message-template'

describe('renderMessage', () => {
  it('sustituye grupo y enlace en la plantilla del evento', () => {
    const texto = renderMessage({
      template: '{grupo}, su invitación: {enlace}',
      locale: 'es',
      groupLabel: 'Familia Rojas Peña',
      url: 'https://x.bo/i/abc',
    })
    expect(texto).toBe('Familia Rojas Peña, su invitación: https://x.bo/i/abc')
  })

  it('{nombre} es el nombre de la invitación, y {grupo} sigue valiendo en las plantillas ya guardadas', () => {
    expect(renderMessage({ template: 'Hola {nombre}: {enlace}', locale: 'es', groupLabel: 'Ana Vega', url: 'u' })).toBe('Hola Ana Vega: u')
    expect(renderMessage({ template: 'Hola {grupo}: {enlace}', locale: 'es', groupLabel: 'Ana Vega', url: 'u' })).toBe('Hola Ana Vega: u')
  })

  it('la plantilla por defecto no habla de grupos', () => {
    expect(renderMessage({ template: null, locale: 'es', groupLabel: 'Ana', url: 'u' })).not.toContain('{')
  })

  it('sin plantilla usa la del idioma del evento', () => {
    expect(renderMessage({ template: null, locale: 'en', groupLabel: 'Ana', url: 'u' })).toContain('Hello Ana')
    expect(renderMessage({ template: '   ', locale: 'es', groupLabel: 'Ana', url: 'u' })).toContain('Hola Ana')
  })

  it('un idioma desconocido cae al español en vez de romperse', () => {
    expect(renderMessage({ template: null, locale: 'pt', groupLabel: 'Ana', url: 'u' })).toContain('Hola Ana')
  })
})

describe('whatsappLink', () => {
  it('limpia el teléfono: wa.me no admite signo, espacios ni guiones', () => {
    const url = whatsappLink({ phone: '+591 700-11122', message: 'hola' })
    expect(url).toBe('https://wa.me/59170011122?text=hola')
  })

  it('sin teléfono abre el selector de contacto en vez de fallar', () => {
    expect(whatsappLink({ phone: null, message: 'hola' })).toBe('https://wa.me/?text=hola')
  })

  it('escapa el mensaje entero, con enlace incluido', () => {
    const url = whatsappLink({ phone: null, message: 'ver https://x.bo/i/a?b=c' })
    expect(url).toContain('https%3A%2F%2Fx.bo%2Fi%2Fa%3Fb%3Dc')
  })
})
