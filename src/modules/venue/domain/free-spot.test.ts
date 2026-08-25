import { describe, expect, it } from 'vitest'
import { freeSpot } from './free-spot'

const en = (x: number, y: number) => ({ x, y })

describe('freeSpot', () => {
  it('la primera mesa del salón entra arriba a la izquierda, no en el centro', () => {
    expect(freeSpot([])).toEqual({ x: 18, y: 20 })
  })

  it('la segunda no se pone encima de la primera', () => {
    const sitio = freeSpot([en(18, 20)])
    expect(sitio).not.toEqual({ x: 18, y: 20 })
  })

  it('recorre la rejilla por filas: cuatro por fila y luego baja', () => {
    const ocupados = [en(18, 20), en(39, 20), en(60, 20), en(81, 20)]
    expect(freeSpot(ocupados).y).toBeGreaterThan(20)
  })

  it('nunca sale del plano', () => {
    const sitios: Array<{ x: number; y: number }> = []
    for (let i = 0; i < 40; i += 1) sitios.push(freeSpot(sitios))
    for (const sitio of sitios) {
      expect(sitio.x).toBeGreaterThanOrEqual(0)
      expect(sitio.x).toBeLessThanOrEqual(100)
      expect(sitio.y).toBeGreaterThanOrEqual(0)
      expect(sitio.y).toBeLessThanOrEqual(100)
    }
  })

  it('con la rejilla entera llena vuelve a un sitio válido en vez de reventar', () => {
    const llena: Array<{ x: number; y: number }> = []
    for (let i = 0; i < 200; i += 1) llena.push(freeSpot(llena))
    expect(llena).toHaveLength(200)
    expect(llena.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)).toBe(true)
  })

  it('considera ocupado lo que esté cerca, no solo lo idéntico: dos mesas a un punto se pisan', () => {
    const sitio = freeSpot([en(19, 21)])
    expect(sitio).not.toEqual({ x: 18, y: 20 })
  })
})
