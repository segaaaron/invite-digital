import { describe, expect, it } from 'vitest'
import { bloquesDeTextos, coloresDesconocidos } from './textos-del-asistente'

const nada = {
  nombre_a: null,
  nombre_b: null,
  texto_sobre_nombres: null,
  iniciales: null,
  texto_bajo_nombres: null,
  frase: null,
  fecha_hora: null,
  ceremonia: null,
  recepcion: null,
  ubicacion: null,
  vestimenta: null,
  colores_vestimenta: null,
  anfitriones: null,
  avisos: null,
  cierre: null,
  cancion: null,
}

describe('bloquesDeTextos', () => {
  it('solo cambia lo que trae la propuesta y conserva la foto, el monograma y la hora', () => {
    const actual = {
      hero: { nameA: 'Ana', nameB: 'Luis', monogram: 'AL', portraitImageId: 'foto-1' },
      reception: { place: 'Salón Viejo', address: 'Calle 1', time: '20:00' },
    }
    const b = bloquesDeTextos(actual, { ...nada, nombre_a: 'Ana Lucía', recepcion: { lugar: 'Jardín Luna', direccion: null, hora: null } })
    expect(b.hero).toEqual({ nameA: 'Ana Lucía', nameB: 'Luis', monogram: 'AL', portraitImageId: 'foto-1' })
    expect(b.reception).toEqual({ place: 'Jardín Luna', address: 'Calle 1', time: '20:00' })
    // Lo que no vino no se reescribe.
    expect(Object.keys(b).sort()).toEqual(['hero', 'reception'])
  })

  it('sin nada que cambiar no devuelve bloques', () => {
    expect(bloquesDeTextos({}, nada)).toEqual({})
  })

  it('la fecha, la frase, la vestimenta y el cierre se escriben como el editor los guarda', () => {
    const b = bloquesDeTextos({ dressCode: { imageIds: ['img'] } }, { ...nada, fecha_hora: '2026-12-12T19:30', frase: ' Juntos ', vestimenta: { titulo: 'Formal', nota: null }, cierre: 'Te esperamos' })
    expect(b.schedule).toEqual({ startsAt: '2026-12-12T19:30' })
    expect(b.quote).toEqual({ text: 'Juntos' })
    expect(b.dressCode).toEqual({ imageIds: ['img'], title: 'Formal' })
    expect(b.closing).toEqual({ text: 'Te esperamos' })
  })

  it('padres y padrinos por su papel, sin perder los que no se nombran', () => {
    const actual = { hosts: { label: 'Con la bendición de', names: ['Pedro'], roles: { brideFather: 'Pedro', godparents: ['Rosa'] } } }
    const sinCambio = { titulo: null, padre: null, madre: null, padre_novia: null, madre_novia: 'Carmen', padre_novio: null, madre_novio: null, padrinos: ['Rosa', 'Mario'] }
    expect(bloquesDeTextos(actual, { ...nada, anfitriones: sinCambio }).hosts).toEqual({ label: 'Con la bendición de', names: [], roles: { brideFather: 'Pedro', brideMother: 'Carmen', godparents: ['Rosa', 'Mario'] } })
  })

  it('la ubicación se guarda como enlace del mapa; los colores por nombre o hex; la canción con su artista', () => {
    const b = bloquesDeTextos({ map: { label: 'Cómo llegar', coords: '1,2' } }, { ...nada, ubicacion: 'Jardín Luna, Santa Cruz', colores_vestimenta: ['Verde salvia', '#AABBCC'], cancion: { titulo: 'Perfect', artista: 'Ed Sheeran' } })
    expect(b.map?.label).toBe('Cómo llegar')
    expect(b.map?.href).toContain('Jard')
    expect(b.map?.coords).toBeUndefined()
    expect(b.dressCode?.colors).toEqual(['#9caf88', '#aabbcc'])
    expect(b.music).toEqual({ track: 'Perfect', artist: 'Ed Sheeran' })
    expect(coloresDesconocidos({ ...nada, colores_vestimenta: ['fucsia neón'] })).toEqual(['fucsia neón'])
  })
})
