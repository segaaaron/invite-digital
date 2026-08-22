import { describe, expect, it } from 'vitest'
import { tallyViews } from './tally'

const AHORA = new Date('2026-08-22T18:00:00Z')
const hoy = (h: number) => new Date(`2026-08-22T${String(h).padStart(2, '0')}:00:00Z`)
const ayer = new Date('2026-08-21T23:00:00Z')

describe('tallyViews', () => {
  it('cuenta el total y el «hoy» por separado', () => {
    const tally = tallyViews(
      [
        { device: 'mobile', source: 'whatsapp', viewedAt: hoy(9) },
        { device: 'mobile', source: 'whatsapp', viewedAt: hoy(10) },
        { device: 'desktop', source: 'direct', viewedAt: ayer },
      ],
      AHORA,
    )
    expect(tally.total).toBe(3)
    expect(tally.today).toBe(2)
  })

  it('sin visitas no divide por cero ni pinta NaN', () => {
    const tally = tallyViews([], AHORA)
    expect(tally.total).toBe(0)
    expect(tally.devices.every((d) => d.percent === 0)).toBe(true)
    expect(tally.sources.every((s) => s.percent === 0)).toBe(true)
  })

  it('enseña todas las categorías, también las que están a cero', () => {
    // Una columna que desaparece al estar a cero hace creer que nadie usa ese camino
    // cuando lo que pasa es que no hay dato.
    const tally = tallyViews([{ device: 'mobile', source: 'qr', viewedAt: hoy(8) }], AHORA)
    expect(tally.devices.map((d) => d.label)).toEqual(['Móvil', 'Tableta', 'Escritorio'])
    expect(tally.sources).toHaveLength(4)
    expect(tally.devices[0]?.percent).toBe(100)
  })
})
