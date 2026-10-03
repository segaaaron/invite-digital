import { describe, expect, it } from 'vitest'
import { fechasDeMuestra } from './fechas-de-muestra'

describe('fechasDeMuestra', () => {
  it('pone la fiesta 60 días por delante, con la hora del modelo, y el plazo 3 semanas antes', () => {
    expect(fechasDeMuestra('2026-10-02', '2026-09-12T19:00:00')).toEqual({
      eventDate: '2026-12-01',
      rsvpDeadline: '2026-11-10',
      startsAt: '2026-12-01T19:00:00',
    })
  })

  it('sin hora en el modelo, a las 19:00', () => {
    expect(fechasDeMuestra('2026-12-20', undefined).startsAt).toBe('2027-02-18T19:00:00')
  })

  it('el plazo siempre queda antes de la fiesta y después de hoy', () => {
    const f = fechasDeMuestra('2027-01-31', '2026-09-20T13:00:00')
    expect(f.rsvpDeadline > '2027-01-31').toBe(true)
    expect(f.rsvpDeadline < f.eventDate).toBe(true)
  })
})
