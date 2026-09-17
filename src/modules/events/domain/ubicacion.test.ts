import { describe, expect, it } from 'vitest'
import { comoLlegar, enlaceDeUbicacion, mapaIncrustado } from './ubicacion'

const embed = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`

describe('mapaIncrustado', () => {
  it('saca las coordenadas de un enlace de Google Maps con @lat,lng', () => {
    expect(mapaIncrustado({ href: 'https://www.google.com/maps/place/Hacienda/@-16.5001,-68.1193,17z/data=!3m1' })).toBe(embed('-16.5001,-68.1193'))
  })

  it('usa la búsqueda de un enlace con query o q', () => {
    expect(mapaIncrustado({ href: 'https://www.google.com/maps/search/?api=1&query=Salón+Las+Estrellas,+La+Paz' })).toBe(embed('Salón Las Estrellas, La Paz'))
    expect(mapaIncrustado({ href: 'https://maps.google.com/?q=-17.39,-66.15' })).toBe(embed('-17.39,-66.15'))
  })

  it('usa el nombre del sitio de un enlace /place/', () => {
    expect(mapaIncrustado({ href: 'https://www.google.com/maps/place/Hotel+Europa/data=!4m2' })).toBe(embed('Hotel Europa'))
  })

  it('entiende las coordenadas escritas a la antigua', () => {
    expect(mapaIncrustado({ coords: '19.32°N · 99.18°W' })).toBe(embed('19.32,-99.18'))
    expect(mapaIncrustado({ coords: '16.50°S · 68.12°W' })).toBe(embed('-16.5,-68.12'))
  })

  it('sin nada que ubicar, cae a la dirección del lugar; y sin eso, no hay mapa', () => {
    expect(mapaIncrustado({ label: 'HACIENDA' }, 'Hacienda Las Estrellas, Km 8')).toBe(embed('Hacienda Las Estrellas, Km 8'))
    expect(mapaIncrustado({ label: 'HACIENDA' })).toBeNull()
  })
})

describe('enlaceDeUbicacion', () => {
  it('un enlace se queda; una dirección escrita se vuelve búsqueda de Google Maps', () => {
    expect(enlaceDeUbicacion('https://maps.app.goo.gl/xyz')).toBe('https://maps.app.goo.gl/xyz')
    expect(enlaceDeUbicacion('  Av. Arce 2020, La Paz ')).toBe('https://www.google.com/maps/search/?api=1&query=Av.%20Arce%202020%2C%20La%20Paz')
    expect(enlaceDeUbicacion('   ')).toBe('')
  })
})

describe('comoLlegar', () => {
  it('prefiere el enlace; si no, busca las coordenadas o la dirección', () => {
    expect(comoLlegar({ href: 'https://maps.app.goo.gl/xyz' })).toBe('https://maps.app.goo.gl/xyz')
    expect(comoLlegar({ coords: '19.32°N · 99.18°W' })).toBe('https://www.google.com/maps/search/?api=1&query=19.32%2C-99.18')
    expect(comoLlegar({})).toBeNull()
  })
})
