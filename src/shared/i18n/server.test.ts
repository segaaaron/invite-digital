import { describe, expect, it } from 'vitest'
import { parseLocaleParam } from './server'

describe('parseLocaleParam', () => {
  it('acepta los idiomas soportados', () => {
    expect(parseLocaleParam('es')).toBe('es')
    expect(parseLocaleParam('en')).toBe('en')
  })

  it('devuelve null para un idioma no soportado', () => {
    expect(parseLocaleParam('fr')).toBeNull()
    expect(parseLocaleParam('')).toBeNull()
  })
})
