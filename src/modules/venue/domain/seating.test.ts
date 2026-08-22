import { describe, expect, it } from 'vitest'
import { canSeat, occupancyOf, type SeatedGroup } from './seating'
import type { VenueTable } from './venue-table'

const table: VenueTable = { id: 't1', eventId: 'e1', label: 'Mesa 01', capacity: 8, shape: 'round', x: 0, y: 0 }
const g = (id: string, seats: number, tableId: string | null = null): SeatedGroup => ({
  id,
  label: `G${id}`,
  seats,
  tableId,
})

describe('occupancyOf', () => {
  it('mesa vacía', () => expect(occupancyOf(table, [])).toEqual({ taken: 0, free: 8 }))

  it('suma los cupos de los grupos sentados en ella', () =>
    expect(occupancyOf(table, [g('a', 4, 't1'), g('b', 2, 't1'), g('c', 5, 't2')])).toEqual({ taken: 6, free: 2 }))

  it('ignora a los que no tienen mesa', () =>
    expect(occupancyOf(table, [g('a', 3, 't1'), g('b', 5)])).toEqual({ taken: 3, free: 5 }))

  it('mesa llena justo', () => expect(occupancyOf(table, [g('a', 8, 't1')])).toEqual({ taken: 8, free: 0 }))

  it('nunca informa de sitios libres negativos aunque la mesa se haya sobrecargado', () =>
    expect(occupancyOf(table, [g('a', 8, 't1'), g('b', 3, 't1')])).toEqual({ taken: 11, free: 0 }))
})

describe('canSeat', () => {
  it('cabe si sobran sitios', () => expect(canSeat(table, g('x', 2), [g('a', 4, 't1')])).toBe(true))

  it('cabe justo', () => expect(canSeat(table, g('x', 4), [g('a', 4, 't1')])).toBe(true))

  it('no cabe por uno: un grupo no se parte', () => expect(canSeat(table, g('x', 5), [g('a', 4, 't1')])).toBe(false))

  it('un grupo ya sentado en esa mesa no se cuenta dos veces', () =>
    expect(canSeat(table, g('a', 4, 't1'), [g('a', 4, 't1')])).toBe(true))

  it('un grupo que se muda desde otra mesa sí ocupa sitio nuevo', () =>
    expect(canSeat(table, g('x', 5, 't2'), [g('a', 4, 't1'), g('x', 5, 't2')])).toBe(false))

  it('un grupo más grande que la mesa entera nunca cabe', () =>
    expect(canSeat(table, g('x', 9), [])).toBe(false))
})
