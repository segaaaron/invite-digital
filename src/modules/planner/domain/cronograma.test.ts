import { describe, expect, it } from 'vitest'
import { avisosDelCronograma, momentoActual, itinerarioDeInvitacion, type Momento } from './cronograma'

const m = (parcial: Partial<Momento>): Momento => ({ id: 'x', startsAt: '20:00', durationMin: 30, title: 'Momento', place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: 0, enInvitacion: false, icono: null, ...parcial })

describe('avisosDelCronograma', () => {
  it('avisa si dos momentos se pisan y si quedan menos de diez minutos entre ellos', () => {
    const avisos = avisosDelCronograma([
      m({ id: 'a', title: 'Brindis', startsAt: '21:00', durationMin: 20 }),
      m({ id: 'b', title: 'Primer baile', startsAt: '21:15', durationMin: 10 }),
      m({ id: 'c', title: 'Torta', startsAt: '21:30', durationMin: 15 }),
      m({ id: 'd', title: 'Ramo', startsAt: '22:00', durationMin: 10 }),
    ])
    expect(avisos).toEqual([
      { id: 'b', tipo: 'se_pisa', con: 'Brindis' },
      { id: 'c', tipo: 'margen_corto', con: 'Primer baile' },
    ])
  })
  // Una fiesta cruza la medianoche: el vals sorpresa a las 00:30 va después de la torta de las 23:45.
  it('pasada la medianoche sigue contando como la misma noche', () => {
    expect(avisosDelCronograma([m({ id: 'a', startsAt: '23:45', durationMin: 20 }), m({ id: 'b', startsAt: '00:30', durationMin: 10 })])).toEqual([])
  })
})

describe('momentoActual', () => {
  const lista = [m({ id: 'a', startsAt: '20:00', durationMin: 30 }), m({ id: 'b', startsAt: '21:00', durationMin: 30 }), m({ id: 'c', startsAt: '23:50', durationMin: 30 })]
  it('dice qué pasa ahora y qué sigue', () => {
    expect(momentoActual(lista, '20:10')).toEqual({ ahora: 'a', sigue: 'b' })
    expect(momentoActual(lista, '20:45')).toEqual({ ahora: null, sigue: 'b' })
    expect(momentoActual(lista, '00:05')).toEqual({ ahora: 'c', sigue: null })
  })
})

describe('itinerarioDeInvitacion', () => {
  const m = (id: string, startsAt: string, title: string, enInvitacion: boolean, icono: string | null = null) =>
    ({ id, startsAt, title, enInvitacion, icono, durationMin: 15, place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: 0 }) as const

  // Un solo cronograma: los invitados ven los momentos marcados, en orden de hora y con su icono.
  it('solo los marcados, en orden de la noche, con su icono', () => {
    expect(
      itinerarioDeInvitacion([m('a', '00:30', 'Hora loca', true, 'fiesta'), m('b', '20:00', 'Vals', false), m('c', '19:00', 'Recepción', true, 'recepcion')]),
    ).toEqual([
      { time: '19:00', label: 'Recepción', imageId: 'recepcion' },
      { time: '00:30', label: 'Hora loca', imageId: 'fiesta' },
    ])
  })

  it('sin ninguno marcado no hay itinerario desde el cronograma', () => {
    expect(itinerarioDeInvitacion([m('b', '20:00', 'Vals', false)])).toBeNull()
  })
})
