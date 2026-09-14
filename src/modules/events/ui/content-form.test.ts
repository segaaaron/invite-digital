import { describe, expect, it } from 'vitest'
import { parseInvitationContent } from '../domain/invitation-content'
import { aValor, estadoInicial } from './content-form'
import { FORMAS } from './content-shapes'

describe('estadoInicial', () => {
  it('reparte el bloque guardado por campos, con el texto tal cual', () => {
    const estado = estadoInicial(FORMAS.music, { track: 'At Last', artist: 'Etta James' })
    // `audioMediaId` vacío y no ausente: el formulario tiene una casilla por campo del
    // bloque, y el del audio existe aunque este evento no tenga música subida todavía.
    expect(estado.campos).toEqual({ track: 'At Last', artist: 'Etta James', audioMediaId: '' })
  })

  it('deja en blanco lo que el bloque no traía, para que el formulario se pinte entero', () => {
    const estado = estadoInicial(FORMAS.music, { track: 'At Last' })
    expect(estado.campos.artist).toBe('')
  })

  it('recorta la fecha a lo que admite un campo de fecha y hora', () => {
    // `datetime-local` no acepta los segundos: con ellos el campo se pinta vacío y el
    // atelier cree que la cuenta atrás no está puesta.
    const estado = estadoInicial(FORMAS.schedule, { startsAt: '2026-10-18T16:00:00' })
    expect(estado.campos.startsAt).toBe('2026-10-18T16:00')
  })

  it('trae la lista suelta de un bloque que la tiene', () => {
    const estado = estadoInicial(FORMAS.hosts, { label: 'PADRES', names: ['Ana', 'Luis'] })
    expect(estado.campos.label).toBe('PADRES')
    expect(estado.lista).toEqual(['Ana', 'Luis'])
  })

  it('trae las filas de una lista, cada una con todos sus campos', () => {
    const estado = estadoInicial(FORMAS.itinerary, [{ time: '16:00 h', label: 'Ceremonia' }])
    expect(estado.filas).toEqual([{ time: '16:00 h', label: 'Ceremonia', note: '', imageId: '' }])
  })

  it('un bloque que no existe todavía arranca vacío en vez de reventar', () => {
    expect(estadoInicial(FORMAS.music, undefined).campos).toEqual({ track: '', artist: '', audioMediaId: '' })
    expect(estadoInicial(FORMAS.itinerary, null).filas).toEqual([])
    expect(estadoInicial(FORMAS.itinerary, { no: 'es una lista' }).filas).toEqual([])
  })
})

describe('aValor', () => {
  it('devuelve solo lo que se escribió', () => {
    const estado = { campos: { track: 'At Last', artist: '' }, lista: [], filas: [] }
    expect(aValor(FORMAS.music, estado)).toEqual({ track: 'At Last' })
  })

  it('un bloque vaciado a mano es un objeto vacío, que es como se quita una sección', () => {
    // Y no `null`: la sección se quita porque el dominio descarta el bloque sin claves.
    const estado = { campos: { track: '  ', artist: '' }, lista: [], filas: [] }
    expect(aValor(FORMAS.music, estado)).toEqual({})
  })

  it('incluye la lista suelta sin sus huecos', () => {
    const estado = { campos: { label: 'PADRES' }, lista: ['Ana', '  ', 'Luis'], filas: [] }
    expect(aValor(FORMAS.hosts, estado)).toEqual({ label: 'PADRES', names: ['Ana', 'Luis'] })
  })

  it('un bloque de filas es la lista, no un objeto', () => {
    const estado = {
      campos: {},
      lista: [],
      filas: [{ time: '16:00 h', label: 'Ceremonia', note: '', imageId: 'church' }],
    }
    expect(aValor(FORMAS.itinerary, estado)).toEqual([{ time: '16:00 h', label: 'Ceremonia', imageId: 'church' }])
  })

  it('descarta la fila que quedó del todo en blanco', () => {
    const estado = { campos: {}, lista: [], filas: [{ time: '', label: '', note: '', imageId: '' }] }
    expect(aValor(FORMAS.itinerary, estado)).toEqual([])
  })

  it('lo que sale de aquí es lo que el dominio guarda, sin perder nada por el camino', () => {
    // La prueba que importa: el formulario no puede producir algo que el dominio descarte
    // en silencio, porque el atelier vería desaparecer lo que acaba de escribir.
    const estado = {
      campos: { label: 'PADRES' },
      lista: ['Ana', 'Luis'],
      filas: [],
    }
    const valor = aValor(FORMAS.hosts, estado)
    expect(parseInvitationContent({ hosts: valor }).hosts).toEqual({ label: 'PADRES', names: ['Ana', 'Luis'] })
  })
})
