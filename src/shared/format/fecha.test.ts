import { describe, expect, it } from 'vitest'
import { diaCorto, diaDelEvento, faltaPara, fecha, fechaHora, hace, hora } from './fecha'

describe('fechas del panel', () => {
  // 18:08 UTC son las 14:08 en La Paz.
  const instante = new Date('2026-08-29T18:08:01Z')

  it('compone fecha y hora a mano, en hora de Bolivia y en 24 h', () => {
    expect(fechaHora(instante)).toBe('29 de agosto · 14:08')
    expect(fecha(instante)).toBe('29 de agosto')
    expect(hora(instante)).toBe('14:08')
  })

  it('pasada la medianoche UTC sigue siendo el día anterior en Bolivia', () => {
    expect(fecha(new Date('2026-08-30T02:00:00Z'))).toBe('29 de agosto')
  })
})

describe('fechas de un día (sin hora)', () => {
  it('la fecha de un evento se lee entera y sin ISO', () => {
    expect(diaDelEvento('2026-12-05')).toBe('sáb 5 dic 2026')
    expect(diaCorto('2026-12-05')).toBe('5 dic')
    expect(diaCorto('2027-02-14', '2026-09-28')).toBe('14 feb 2027')
  })

  it('no se corre de día por la zona del servidor', () => {
    expect(diaDelEvento('2026-10-12')).toBe('lun 12 oct 2026')
  })
})

describe('tiempo relativo', () => {
  const ahora = new Date('2026-09-28T15:00:00Z')
  it('dice cuánto hace en palabras', () => {
    expect(hace(new Date('2026-09-28T14:59:30Z'), ahora)).toBe('ahora')
    expect(hace(new Date('2026-09-28T14:20:00Z'), ahora)).toBe('hace 40 min')
    expect(hace(new Date('2026-09-28T12:00:00Z'), ahora)).toBe('hace 3 h')
    expect(hace(new Date('2026-09-27T12:00:00Z'), ahora)).toBe('ayer')
    expect(hace(new Date('2026-09-20T12:00:00Z'), ahora)).toBe('hace 8 días')
  })

  it('cuenta los días hasta un evento', () => {
    expect(faltaPara(0)).toBe('hoy')
    expect(faltaPara(1)).toBe('mañana')
    expect(faltaPara(-1)).toBe('ayer')
    expect(faltaPara(14)).toBe('en 14 días')
    expect(faltaPara(90)).toBe('en 3 meses')
    expect(faltaPara(-400)).toBe('hace 1 año')
  })
})
