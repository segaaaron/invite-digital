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

  // Pedido por el usuario: el mensaje era seco. Saluda, dice el día y trata de tú o de ustedes.
  it('por defecto es cordial, dice la fecha y trata de tú a quien va solo', () => {
    const texto = renderMessage({ template: null, locale: 'es', groupLabel: 'Pamela Medrano', url: 'https://x.bo/i/a', seats: 1, fecha: 'sábado, 17 de octubre' })
    expect(texto).toBe(
      'Hola Pamela Medrano ✨\n\nCon mucha alegría queremos compartir contigo un día muy especial: el sábado, 17 de octubre. Tu presencia lo hará aún más bonito.\n\nAquí está tu invitación, con todos los detalles y para confirmar tu asistencia 💌\nhttps://x.bo/i/a\n\n¡Te esperamos con mucho cariño!',
    )
  })

  it('a una familia le habla de ustedes, y sin fecha no la inventa', () => {
    const texto = renderMessage({ template: null, locale: 'es', groupLabel: 'Familia Rojas', url: 'u', seats: 4, fecha: null })
    expect(texto).toContain('compartir con ustedes un día muy especial. Su presencia')
    expect(texto).toContain('¡Los esperamos con mucho cariño!')
  })

  it('una plantilla propia puede usar {fecha} y {evento}', () => {
    expect(renderMessage({ template: '{nombre}: {evento}, {fecha}. {enlace}', locale: 'es', groupLabel: 'Ana', url: 'u', evento: 'Quince de Camila', fecha: 'sábado, 17 de octubre' })).toBe(
      'Ana: Quince de Camila, sábado, 17 de octubre. u',
    )
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
