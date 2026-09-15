import { describe, expect, it } from 'vitest'
import { avisosDelCronograma, momentoActual, minutos, plantillaDeCronograma, type Momento } from './cronograma'

const m = (parcial: Partial<Momento>): Momento => ({ id: 'x', startsAt: '20:00', durationMin: 30, title: 'Momento', place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: 0, ...parcial })

describe('plantillaDeCronograma', () => {
  it('la boda trae su primer baile y el ramo; XV, el vals con el papá y el cambio de zapatillas', () => {
    const boda = plantillaDeCronograma('boda').map((x) => x.title.toLowerCase())
    const xv = plantillaDeCronograma('xv').map((x) => x.title.toLowerCase())
    expect(boda.some((t) => t.includes('primer baile'))).toBe(true)
    expect(boda.some((t) => t.includes('ramo'))).toBe(true)
    expect(xv.some((t) => t.includes('vals con el papá'))).toBe(true)
    expect(xv.some((t) => t.includes('zapatillas'))).toBe(true)
    expect(xv.some((t) => t.includes('novi'))).toBe(false)
  })
  it('las horas van en orden y cada una es HH:MM', () => {
    const horas = plantillaDeCronograma('boda').map((x) => minutos(x.startsAt))
    expect(horas).toEqual([...horas].sort((a, b) => a - b))
  })
})

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
