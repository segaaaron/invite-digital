import { describe, expect, it } from 'vitest'
import { doorTally, type DoorGroup } from './door-tally'
import type { ResolvedArrival } from './conflict'

const group = (id: string, seats: number, attending: number | null, revoked = false): DoorGroup => ({
  id,
  label: `Grupo ${id}`,
  seats,
  attending,
  revoked,
})

const arrived = (guestGroupId: string, arrivedCount: number): ResolvedArrival => ({
  guestGroupId,
  arrivedAt: new Date('2026-10-18T21:00:00Z'),
  arrivedCount,
  scanCount: 1,
})

describe('doorTally', () => {
  it('sin llegadas, todo son esperados', () => {
    const t = doorTally([group('a', 4, 4), group('b', 2, 2)], [])
    expect(t.expectedGroups).toBe(2)
    expect(t.arrivedGroups).toBe(0)
    expect(t.expectedHeads).toBe(6)
    expect(t.headsInside).toBe(0)
  })

  it('cuenta las personas que hay dentro, no los cupos', () => {
    const t = doorTally([group('a', 4, 4)], [arrived('a', 2)])
    expect(t.headsInside).toBe(2)
    expect(t.arrivedGroups).toBe(1)
  })

  it('quien no confirmó suma a esperados con cero cabezas', () => {
    const t = doorTally([group('a', 4, null)], [])
    expect(t.expectedGroups).toBe(1)
    expect(t.expectedHeads).toBe(0)
  })

  it('quien dijo que no vendría y aparece igual cuenta como llegado', () => {
    // Un grupo revocado no es esperado, pero si entra, entró.
    const t = doorTally([group('a', 4, 4), group('x', 2, 0, true)], [arrived('x', 2)])
    expect(t.expectedGroups).toBe(1)
    expect(t.arrivedGroups).toBe(1)
    expect(t.headsInside).toBe(2)
    expect(t.unexpectedGroups).toBe(1)
  })

  it('una llegada de un grupo que ya no está en la lista no rompe el conteo', () => {
    const t = doorTally([group('a', 4, 4)], [arrived('fantasma', 3)])
    expect(t.arrivedGroups).toBe(1)
    expect(t.headsInside).toBe(3)
  })
})
