import { describe, expect, it } from 'vitest'
import { autoAssign, canSeat, occupancyOf, type SeatedGroup } from './seating'
import type { VenueTable } from './venue-table'

const table: VenueTable = { id: 't1', eventId: 'e1', label: 'Mesa 01', capacity: 8, shape: 'round', notes: null, x: 0, y: 0 }
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

describe('autoAssign', () => {
  const t = (id: string, label: string, capacity: number): VenueTable => ({
    id,
    eventId: 'e1',
    label,
    capacity,
    shape: 'round', notes: null,
    x: 0,
    y: 0,
  })

  it('es determinista: dos ejecuciones dan el mismo resultado', () => {
    const tables = [t('A', 'Mesa A', 6), t('B', 'Mesa B', 4), t('C', 'Mesa C', 10)]
    const groups = [g('p', 2), g('q', 5), g('r', 4), g('s', 3), g('u', 6)]
    expect(autoAssign(tables, groups)).toEqual(autoAssign(tables, groups))
  })

  it('nunca mueve lo que un humano colocó', () => {
    const r = autoAssign([table], [g('a', 4, 't1'), g('b', 2)])
    expect(r.assignments.map((x) => x.groupId)).not.toContain('a')
    expect(r.assignments).toEqual([{ groupId: 'b', tableId: 't1' }])
  })

  it('cuenta lo ya sentado al medir el sitio que queda', () => {
    // La mesa tiene 8 y un humano ya sentó a 6: solo caben grupos de 2 o menos.
    const r = autoAssign([table], [g('a', 6, 't1'), g('b', 3)])
    expect(r.assignments).toHaveLength(0)
    expect(r.unplaced.map((u) => u.id)).toEqual(['b'])
  })

  it('coloca primero los grupos grandes', () => {
    // Dos mesas de 4. Grupos de 4, 2 y 2. El de 4 tiene que entrar entero.
    const r = autoAssign([t('A', 'Mesa A', 4), t('B', 'Mesa B', 4)], [g('p', 2), g('q', 2), g('grande', 4)])
    expect(r.unplaced).toHaveLength(0)
  })

  it('elige la mesa que deja el menor hueco', () => {
    const r = autoAssign([t('A', 'Mesa A', 6), t('B', 'Mesa B', 4)], [g('x', 4)])
    expect(r.assignments[0]?.tableId).toBe('B')
  })

  it('a igualdad de hueco, elige la mesa de etiqueta menor', () => {
    const r = autoAssign([t('Z', 'Mesa Z', 4), t('A', 'Mesa A', 4)], [g('x', 4)])
    expect(r.assignments[0]?.tableId).toBe('A')
  })

  it('a igualdad de cupos, reparte los grupos por etiqueta alfabética', () => {
    const r = autoAssign([t('A', 'Mesa A', 2)], [{ ...g('b', 2), label: 'Zurita' }, { ...g('a', 2), label: 'Alba' }])
    expect(r.assignments).toEqual([{ groupId: 'a', tableId: 'A' }])
    expect(r.unplaced.map((u) => u.id)).toEqual(['b'])
  })

  it('informa de quien no cabe en ninguna, sin partirlo', () => {
    const r = autoAssign([{ ...table, capacity: 2 }], [g('x', 5)])
    expect(r.assignments).toHaveLength(0)
    expect(r.unplaced.map((u) => u.id)).toEqual(['x'])
  })

  it('sin mesas, todos quedan sin colocar', () => {
    expect(autoAssign([], [g('x', 2)]).unplaced).toHaveLength(1)
  })

  it('sin grupos sueltos no propone nada', () => {
    expect(autoAssign([table], [g('a', 4, 't1')])).toEqual({ assignments: [], unplaced: [] })
  })

  it('no sobrecarga una mesa al colocar varios grupos en la misma pasada', () => {
    const r = autoAssign([t('A', 'Mesa A', 5)], [g('p', 3), g('q', 3)])
    expect(r.assignments).toEqual([{ groupId: 'p', tableId: 'A' }])
    expect(r.unplaced.map((u) => u.id)).toEqual(['q'])
  })
})
