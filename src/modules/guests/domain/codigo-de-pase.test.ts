import { describe, expect, it } from 'vitest'
import { ALFABETO_DE_PASE, codigoDePase, leerCodigoDePase } from './codigo-de-pase'

describe('codigoDePase', () => {
  it('son cinco caracteres del alfabeto, sin 0, O, 1, I ni L', () => {
    for (let i = 0; i < 200; i++) {
      const c = codigoDePase()
      expect(c).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/)
    }
    expect(ALFABETO_DE_PASE).not.toMatch(/[01OIL]/)
  })

  it('lee lo que escribe la puerta con espacios, guion o minúsculas', () => {
    expect(leerCodigoDePase(' k7p-3x ')).toBe('K7P3X')
    expect(leerCodigoDePase('K7P3')).toBeNull()
    expect(leerCodigoDePase('https://luxuryatelier.net/i/abc')).toBeNull()
    expect(leerCodigoDePase('K0P3X')).toBeNull()
  })
})
