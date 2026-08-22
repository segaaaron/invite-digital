import { describe, expect, it } from 'vitest'
import { resolveArrival } from './conflict'
import type { Arrival } from './arrival'

const scan = (scanId: string, arrivedCount: number, iso: string, voidedAt: Date | null = null): Arrival => ({
  scanId,
  guestGroupId: 'g1',
  arrivedCount,
  scannedAt: new Date(iso),
  voidedAt,
})

describe('resolveArrival', () => {
  it('sin escaneos no hay llegada', () => {
    expect(resolveArrival([])).toBeNull()
  })

  it('con un solo escaneo devuelve ese', () => {
    const r = resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z')])
    expect(r?.arrivedCount).toBe(3)
    expect(r?.arrivedAt.toISOString()).toBe('2026-10-18T21:00:00.000Z')
  })

  it('dos puertas: gana la hora más temprana, porque es cuando cruzaron', () => {
    const r = resolveArrival([
      scan('b', 2, '2026-10-18T21:10:00Z'),
      scan('a', 3, '2026-10-18T21:00:00Z'),
    ])
    expect(r?.arrivedAt.toISOString()).toBe('2026-10-18T21:00:00.000Z')
  })

  it('la cantidad la manda el escaneo más reciente: es la última corrección humana', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 2, '2026-10-18T21:10:00Z'),
    ])
    expect(r?.arrivedCount).toBe(2)
  })

  it('ignora los escaneos con lápida', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 9, '2026-10-18T21:10:00Z', new Date()),
    ])
    expect(r?.arrivedCount).toBe(3)
    expect(r?.scanCount).toBe(1)
  })

  it('si todos tienen lápida, el grupo no ha llegado', () => {
    expect(resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z', new Date())])).toBeNull()
  })

  it('cuenta los escaneos vivos, para poder avisar de un conflicto', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 2, '2026-10-18T21:10:00Z'),
    ])
    expect(r?.scanCount).toBe(2)
  })
})
