import { describe, expect, it } from 'vitest'
import { countdownFrom, pad } from './time'

describe('pad', () => {
  it('rellena a dos cifras', () => {
    expect(pad(7)).toBe('07')
    expect(pad(42)).toBe('42')
  })

  it('admite otro ancho', () => {
    expect(pad(7, 3)).toBe('007')
  })

  it('no recorta lo que ya es más largo', () => {
    expect(pad(1234)).toBe('1234')
  })
})

describe('countdownFrom', () => {
  // Recibe el instante como argumento y no llama al reloj, igual que `dueReminders` recibe
  // el día: así la víspera se prueba sin tocar el reloj del sistema.
  const ahora = new Date('2026-09-10T12:00:00Z')

  it('reparte el tiempo que falta', () => {
    expect(countdownFrom('2026-09-12T19:00:00Z', ahora)).toEqual({
      days: 2,
      hours: 7,
      mins: 0,
      secs: 0,
      over: false,
    })
  })

  it('cuenta minutos y segundos', () => {
    expect(countdownFrom('2026-09-10T13:24:37Z', ahora)).toEqual({
      days: 0,
      hours: 1,
      mins: 24,
      secs: 37,
      over: false,
    })
  })

  it('devuelve todo a cero cuando la fecha ya pasó', () => {
    // Nunca cifras negativas: la gente vuelve al enlace durante semanas para consultar la
    // hora o la mesa, y «faltan -3 días» está roto a la vista de todos ellos.
    expect(countdownFrom('2026-09-01T00:00:00Z', ahora)).toEqual({
      days: 0,
      hours: 0,
      mins: 0,
      secs: 0,
      over: true,
    })
  })

  it('trata el instante exacto como pasado', () => {
    expect(countdownFrom('2026-09-10T12:00:00Z', ahora).over).toBe(true)
  })

  it('trata una fecha ilegible como pasada, sin reventar', () => {
    // Un `Invalid Date` sin esto pinta «NaN días» en mitad de la invitación.
    expect(countdownFrom('no es una fecha', ahora)).toEqual({
      days: 0,
      hours: 0,
      mins: 0,
      secs: 0,
      over: true,
    })
  })

  it('aguanta una fecha muy lejana sin desbordar', () => {
    expect(countdownFrom('2126-09-12T19:00:00Z', ahora).days).toBeGreaterThan(36_000)
  })
})
