import { describe, expect, it } from 'vitest'
import { calendarioIcs, enlaceDeGoogle } from './ics'

const AHORA = new Date('2026-09-29T12:00:00Z')

describe('calendarioIcs', () => {
  it('pasa la hora de Bolivia a UTC (+4 h) y cruza el día si hace falta', () => {
    const ics = calendarioIcs('Boda', [{ uid: 'a@x', inicio: '2026-12-12T21:30', minutos: 300, titulo: 'Boda' }], AHORA)
    expect(ics).toContain('DTSTART:20261213T013000Z')
    expect(ics).toContain('DTEND:20261213T063000Z')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true)
  })

  it('un día entero termina al día siguiente, también a fin de mes', () => {
    const ics = calendarioIcs('x', [{ uid: 'b@x', inicio: '2026-10-31', titulo: 'Pago' }], AHORA)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261031')
    expect(ics).toContain('DTEND;VALUE=DATE:20261101')
  })

  it('escapa comas, puntos y comas y saltos, y dobla a 75 octetos sin partir una letra', () => {
    const largo = 'Salón Los Álamos, Av. Busch; entre 2 y 3\nfrente al parque '.repeat(3)
    const ics = calendarioIcs('x', [{ uid: 'c@x', inicio: '2026-10-01T10:00', titulo: 'T', lugar: largo }], AHORA)
    expect(ics).toContain('Salón Los Álamos\\, Av. Busch\; entre 2 y 3\\nfrente')
    for (const linea of ics.split('\r\n')) expect(Buffer.byteLength(linea)).toBeLessThanOrEqual(75)
    expect(ics.split('\r\n').join('')).not.toContain('\uFFFD')
  })
})

describe('enlaceDeGoogle', () => {
  it('lleva las fechas en UTC y el lugar', () => {
    const url = new URL(enlaceDeGoogle({ uid: 'x', inicio: '2026-12-12T20:00', minutos: 300, titulo: 'Boda de Ana', lugar: 'Salón' }))
    expect(url.searchParams.get('dates')).toBe('20261213T000000Z/20261213T050000Z')
    expect(url.searchParams.get('location')).toBe('Salón')
  })
})
