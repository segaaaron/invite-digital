import { describe, expect, it } from 'vitest'
import { enOrdenParaElCliente, yaSeCelebro } from './celebrado'

describe('yaSeCelebro', () => {
  // Bolivia es UTC−4 todo el año. La fiesta del sábado sigue de madrugada: se cierra el domingo a las 06:00.
  it('el día del evento y su madrugada siguen abiertos', () => {
    expect(yaSeCelebro('2026-10-10', new Date('2026-10-10T23:00:00-04:00'))).toBe(false)
    expect(yaSeCelebro('2026-10-10', new Date('2026-10-11T05:59:00-04:00'))).toBe(false)
  })

  it('desde las 06:00 del día siguiente, se celebró', () => {
    expect(yaSeCelebro('2026-10-10', new Date('2026-10-11T06:00:00-04:00'))).toBe(true)
    expect(yaSeCelebro('2026-10-10', new Date('2027-01-01T12:00:00-04:00'))).toBe(true)
  })

  it('lo que viene, no', () => {
    expect(yaSeCelebro('2026-12-24', new Date('2026-10-08T12:00:00-04:00'))).toBe(false)
  })
})

describe('enOrdenParaElCliente', () => {
  const ahora = new Date('2026-10-08T12:00:00-04:00')
  it('primero lo que viene (el más cercano), luego lo celebrado (lo último primero)', () => {
    const eventos = [
      { slug: 'boda-2025', eventDate: '2025-05-01' },
      { slug: 'xv-2027', eventDate: '2027-03-01' },
      { slug: 'cumple-2026', eventDate: '2026-11-20' },
      { slug: 'bautizo-2026', eventDate: '2026-02-01' },
    ]
    expect(enOrdenParaElCliente(eventos, ahora).map((e) => e.slug)).toEqual(['cumple-2026', 'xv-2027', 'bautizo-2026', 'boda-2025'])
  })
})
