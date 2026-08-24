import { describe, expect, it } from 'vitest'
import { dailySeries } from './timeline'

const dia = (iso: string) => new Date(`${iso}T12:00:00`)

describe('dailySeries', () => {
  it('devuelve un tramo por día, incluidos los días sin una sola respuesta', () => {
    const serie = dailySeries([dia('2026-08-20')], dia('2026-08-22'), 3)
    expect(serie.map((b) => b.count)).toEqual([1, 0, 0])
  })

  it('termina en el día pedido y empieza `days - 1` días antes', () => {
    const serie = dailySeries([], dia('2026-08-22'), 14)
    expect(serie).toHaveLength(14)
    expect(serie[0]?.day).toBe('2026-08-09')
    expect(serie.at(-1)?.day).toBe('2026-08-22')
  })

  it('agrupa varias respuestas del mismo día', () => {
    const serie = dailySeries([dia('2026-08-22'), dia('2026-08-22'), dia('2026-08-21')], dia('2026-08-22'), 2)
    expect(serie.map((b) => b.count)).toEqual([1, 2])
  })

  it('ignora lo que cae fuera de la ventana en vez de amontonarlo en el primer día', () => {
    const serie = dailySeries([dia('2026-07-01'), dia('2026-08-22')], dia('2026-08-22'), 3)
    expect(serie.map((b) => b.count)).toEqual([0, 0, 1])
  })

  it('etiqueta cada tramo con la inicial de su día de la semana', () => {
    // 2026-08-22 es sábado.
    const serie = dailySeries([], dia('2026-08-22'), 2)
    expect(serie.map((b) => b.label)).toEqual(['V', 'S'])
  })

  it('una ventana de cero días no revienta: devuelve una serie vacía', () => {
    expect(dailySeries([dia('2026-08-22')], dia('2026-08-22'), 0)).toEqual([])
  })
})
