import { describe, expect, it } from 'vitest'
import { elegirVoz, idiomaDelTexto } from './voz'

// Las voces que traen de verdad macOS (Safari), Chrome y Edge.
const MAC = [
  { name: 'Jorge', lang: 'es-ES' },
  { name: 'Mónica', lang: 'es-ES' },
  { name: 'Juan', lang: 'es-MX' },
  { name: 'Paulina', lang: 'es-MX' },
  { name: 'Fred', lang: 'en-US' },
  { name: 'Daniel', lang: 'en-GB' },
  { name: 'Samantha', lang: 'en-US' },
]
const CHROME = [
  { name: 'Google español', lang: 'es-ES' },
  { name: 'Google español de Estados Unidos', lang: 'es-US' },
  { name: 'Google UK English Male', lang: 'en-GB' },
  { name: 'Google US English', lang: 'en-US' },
]
const EDGE = [
  { name: 'Microsoft Alvaro Online (Natural) - Spanish (Spain)', lang: 'es-ES' },
  { name: 'Microsoft Jorge Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
  { name: 'Microsoft Sofia Online (Natural) - Spanish (Bolivia)', lang: 'es-BO' },
  { name: 'Microsoft Dalia Online (Natural) - Spanish (Mexico)', lang: 'es-MX' },
  { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US' },
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
]

describe('la voz de Luxury', () => {
  it('en español elige una mujer latinoamericana, no la de España ni un hombre', () => {
    expect(elegirVoz(MAC, 'es')?.name).toBe('Paulina')
    expect(elegirVoz(CHROME, 'es')?.name).toBe('Google español de Estados Unidos')
    expect(elegirVoz(EDGE, 'es')?.name).toBe('Microsoft Sofia Online (Natural) - Spanish (Bolivia)')
  })

  it('en inglés elige una mujer nativa', () => {
    expect(elegirVoz(MAC, 'en')?.name).toBe('Samantha')
    expect(elegirVoz(CHROME, 'en')?.name).toBe('Google US English')
    expect(elegirVoz(EDGE, 'en')?.name).toBe('Microsoft Aria Online (Natural) - English (United States)')
  })

  it('sin voces de ese idioma no inventa una', () => {
    expect(elegirVoz([{ name: 'Samantha', lang: 'en-US' }], 'es')).toBeUndefined()
  })

  it('la voz sigue el idioma de la respuesta', () => {
    expect(idiomaDelTexto('Listo, registré a Ramón en tu lista de invitados.', 'en')).toBe('es')
    expect(idiomaDelTexto('Done: I added Ramón to your guest list.', 'es')).toBe('en')
  })
})
