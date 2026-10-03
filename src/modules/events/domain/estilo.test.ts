import { describe, expect, it } from 'vitest'
import { acentosPara, contraste, leerEstilo, trasladar, variablesDeAcento, type AcentoDelDiseno } from './estilo'

const BOTANICA: AcentoDelDiseno = { principal: '#5a705c', familia: { salvia: '#5a705c', menta: '#e8efe2' }, fondo: '#fafaf6' }
const NOCHE: AcentoDelDiseno = { principal: '#c5961a', familia: { oro: '#c5961a' }, fondo: '#120c06' }

describe('el estilo del evento', () => {
  it('el principal pasa a ser el elegido, tal cual', () => {
    expect(trasladar('#5a705c', '#5a705c', '#7a2335')).toBe('#7a2335')
  })

  it('un tinte de la familia sigue siendo un tinte del elegido', () => {
    const menta = trasladar('#e8efe2', '#5a705c', '#7a2335')
    expect(contraste(menta, '#ffffff')).toBeLessThan(1.3)
  })

  it('sin elegido no se escribe ninguna variable: el diseño sale como siempre', () => {
    expect(variablesDeAcento(BOTANICA, null)).toEqual({})
    expect(variablesDeAcento(BOTANICA, '#7a2335')).toMatchObject({ '--acento-salvia': '#7a2335' })
  })

  it('solo se ofrecen los colores que se leen sobre el fondo del diseño', () => {
    const claros = acentosPara(BOTANICA).map((c) => c.nombre)
    expect(claros).toContain('Borgoña')
    expect(claros).not.toContain('Champán')
    const oscuros = acentosPara(NOCHE).map((c) => c.nombre)
    expect(oscuros).toContain('Champán')
    expect(oscuros).not.toContain('Azul noche')
  })

  it('lo que el diseño no admite, o un color fuera de la carta, no se guarda', () => {
    const admite = { acento: BOTANICA, caligrafia: true, titulares: false }
    expect(leerEstilo({ acento: '#7A2335', caligrafia: 'allura', titulares: '' }, admite)).toEqual({ acento: '#7a2335', caligrafia: 'allura', titulares: null })
    expect(leerEstilo({ acento: '#123456', caligrafia: '', titulares: '' }, admite)).toBeNull()
    expect(leerEstilo({ acento: '#d8c3a0', caligrafia: '', titulares: '' }, admite)).toBeNull()
    expect(leerEstilo({ acento: '', caligrafia: '', titulares: 'cinzel' }, admite)).toBeNull()
    expect(leerEstilo({ acento: '', caligrafia: 'comic', titulares: '' }, admite)).toBeNull()
    expect(leerEstilo({ acento: '', caligrafia: '', titulares: '' }, admite)).toEqual({ acento: null, caligrafia: null, titulares: null })
  })
})
