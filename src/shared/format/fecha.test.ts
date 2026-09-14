import { describe, expect, it } from 'vitest'
import { fecha, fechaHora, hora } from './fecha'

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
