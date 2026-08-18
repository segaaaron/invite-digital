import { describe, expect, it } from 'vitest'
import { negotiateLocale } from './negotiate'

describe('negotiateLocale', () => {
  it('prefiere la cookie sobre la cabecera', () => {
    expect(negotiateLocale({ cookie: 'es', acceptLanguage: 'en-US,en;q=0.9' })).toBe('es')
  })

  it('ignora una cookie con valor no soportado', () => {
    expect(negotiateLocale({ cookie: 'fr', acceptLanguage: 'es-BO,es;q=0.9' })).toBe('es')
  })

  it('toma el idioma de mayor calidad de la cabecera', () => {
    expect(negotiateLocale({ acceptLanguage: 'fr;q=0.9,es;q=0.8,en;q=0.7' })).toBe('es')
  })

  it('reconoce variantes regionales', () => {
    expect(negotiateLocale({ acceptLanguage: 'es-419' })).toBe('es')
  })

  it('cae a inglés sin cabecera ni cookie', () => {
    expect(negotiateLocale({})).toBe('en')
  })

  it('cae a inglés cuando ningún idioma coincide', () => {
    expect(negotiateLocale({ acceptLanguage: 'de-DE,de;q=0.9' })).toBe('en')
  })
})
