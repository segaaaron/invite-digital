import { describe, expect, it } from 'vitest'
import { loQueSePerderia } from './invitation-content'

describe('loQueSePerderia', () => {
  it('un enlace largo de Google Maps se guarda entero (antes se cortaba a 240)', () => {
    const largo = `https://www.google.com/maps/place/Sal%C3%B3n+Los+Ceibos/@-17.7833,-63.1821,17z/data=${'!3m1!4b1!4m6!3m5'.repeat(20)}`
    expect(largo.length).toBeGreaterThan(300)
    expect(loQueSePerderia('map', { href: largo, label: 'LOS CEIBOS' })).toEqual([])
  })

  it('dice qué texto no cabe y hasta cuánto, y qué valor no es válido', () => {
    expect(loQueSePerderia('reception', { place: 'x'.repeat(250) })).toEqual([{ campo: 'place', motivo: 'largo', maximo: 240 }])
    expect(loQueSePerderia('map', { href: 'javascript:alert(1)' })).toEqual([{ campo: 'href', motivo: 'invalido' }])
  })

  it('las filas vacías se ignoran; una fila con algo escrito que no se guardaría, se avisa', () => {
    expect(loQueSePerderia('gallery', [{ label: '' }, { label: 'Nosotros' }])).toEqual([])
    expect(loQueSePerderia('gallery', [{ label: 'x'.repeat(200) }])).toMatchObject([{ campo: '0.label', motivo: 'largo' }])
  })
})
