import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { VenueTable } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'
import { fakeVenueRepository } from './fake-venue-repository'
import { moveElements } from './move-element'

const mesa = (id: string, eventId = 'e1'): VenueTable => ({
  id,
  eventId,
  label: `Mesa ${id}`,
  capacity: 8,
  shape: 'round',
  x: 50,
  y: 50,
})

const zona = (id: string, eventId = 'e1'): VenueZone => ({
  id,
  eventId,
  kind: 'dance',
  label: 'Pista',
  x: 30,
  y: 30,
  w: 20,
  h: 20,
})

describe('moveElements', () => {
  it('guarda la nueva posición de una mesa', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1')] })
    const r = await moveElements({ venue: fake.repo })({
      eventId: 'e1',
      moves: [{ kind: 'table', id: 't1', x: 12.5, y: 80 }],
    })
    expect(isOk(r) && r.value.moved).toBe(1)
    const [row] = await fake.repo.listTables('e1')
    expect([row?.x, row?.y]).toEqual([12.5, 80])
  })

  it('guarda posición y tamaño de una zona', async () => {
    const fake = fakeVenueRepository({ zones: [zona('z1')] })
    await moveElements({ venue: fake.repo })({
      eventId: 'e1',
      moves: [{ kind: 'zone', id: 'z1', x: 10, y: 10, w: 40, h: 15 }],
    })
    const [row] = await fake.repo.listZones('e1')
    expect([row?.x, row?.y, row?.w, row?.h]).toEqual([10, 10, 40, 15])
  })

  it('mover una zona sin dar tamaño conserva el que tenía', async () => {
    const fake = fakeVenueRepository({ zones: [zona('z1')] })
    await moveElements({ venue: fake.repo })({ eventId: 'e1', moves: [{ kind: 'zone', id: 'z1', x: 1, y: 2 }] })
    const [row] = await fake.repo.listZones('e1')
    expect([row?.w, row?.h]).toEqual([20, 20])
  })

  it('recorta al plano en vez de rechazar: soltar pasado el borde es un gesto normal', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1')] })
    await moveElements({ venue: fake.repo })({
      eventId: 'e1',
      moves: [{ kind: 'table', id: 't1', x: 220, y: -40 }],
    })
    const [row] = await fake.repo.listTables('e1')
    expect([row?.x, row?.y]).toEqual([100, 0])
  })

  it('mueve un lote entero en una sola llamada', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1'), mesa('t2')], zones: [zona('z1')] })
    const r = await moveElements({ venue: fake.repo })({
      eventId: 'e1',
      moves: [
        { kind: 'table', id: 't1', x: 10, y: 10 },
        { kind: 'table', id: 't2', x: 20, y: 20 },
        { kind: 'zone', id: 'z1', x: 30, y: 30 },
      ],
    })
    expect(isOk(r) && r.value.moved).toBe(3)
    const tables = await fake.repo.listTables('e1')
    expect(tables.map((t) => t.x).sort((a, b) => a - b)).toEqual([10, 20])
  })

  it('un elemento de otro evento devuelve wrong_event y no mueve nada del lote', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1'), mesa('t2', 'e2')] })
    const r = await moveElements({ venue: fake.repo })({
      eventId: 'e1',
      moves: [
        { kind: 'table', id: 't1', x: 10, y: 10 },
        { kind: 'table', id: 't2', x: 20, y: 20 },
      ],
    })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
    const [row] = await fake.repo.listTables('e1')
    expect(row?.x).toBe(50)
  })

  it('un elemento inexistente devuelve not_found', async () => {
    const fake = fakeVenueRepository({})
    const r = await moveElements({ venue: fake.repo })({
      eventId: 'e1',
      moves: [{ kind: 'table', id: 'nada', x: 1, y: 1 }],
    })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })

  it('un lote vacío no escribe nada', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1')] })
    const r = await moveElements({ venue: fake.repo })({ eventId: 'e1', moves: [] })
    expect(isOk(r) && r.value.moved).toBe(0)
  })
})
