import { describe, expect, it } from 'vitest'
import { nombreDeCancion } from './audio'

describe('nombreDeCancion', () => {
  it('manda lo que traen las etiquetas del archivo', () => {
    expect(nombreDeCancion({ titulo: 'Tusa', artista: 'Karol G' }, 'x.mp3')).toEqual({ track: 'Tusa', artist: 'Karol G' })
  })

  it('sin etiquetas, lee «Artista - Título» del nombre del fichero', () => {
    expect(nombreDeCancion({ titulo: null, artista: null }, 'Ed Sheeran - Perfect.mp3')).toEqual({ track: 'Perfect', artist: 'Ed Sheeran' })
  })

  it('sin etiquetas ni guion, el nombre del fichero sin extensión', () => {
    expect(nombreDeCancion({ titulo: null, artista: null }, 'vals_de_valeria.m4a')).toEqual({ track: 'vals de valeria', artist: '' })
  })

  it('nunca queda en blanco', () => {
    expect(nombreDeCancion({ titulo: '  ', artista: null }, '.mp3').track).toBe('Canción')
  })
})
