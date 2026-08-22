import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { VenueTable } from '../domain/venue-table'
import type { VenueZone } from '../domain/venue-zone'
import { fakeVenueRepository } from './fake-venue-repository'
import { listSeating } from './list-seating'
import type { SeatedGroupRow } from './ports'

const mesa = (id: string, label: string, capacity: number): VenueTable => ({
  id,
  eventId: 'e1',
  label,
  capacity,
  shape: 'round',
  x: 50,
  y: 50,
})

const zona: VenueZone = { id: 'z1', eventId: 'e1', kind: 'dance', label: 'Pista', x: 10, y: 10, w: 20, h: 20 }

const grupo = (
  id: string,
  seats: number,
  tableId: string | null,
  extra: Partial<SeatedGroupRow> = {},
): SeatedGroupRow => ({
  id,
  eventId: 'e1',
  label: `Familia ${id}`,
  seats,
  tableId,
  revoked: false,
  confirmed: seats,
  ...extra,
})

describe('listSeating', () => {
  it('devuelve cada mesa con su ocupación calculada', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 8)],
      groups: [grupo('a', 4, 't1'), grupo('b', 2, 't1')],
    })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.tables[0]?.taken).toBe(6)
    expect(isOk(r) && r.value.tables[0]?.free).toBe(2)
    expect(isOk(r) && r.value.tables[0]?.groups.map((g) => g.id)).toEqual(['a', 'b'])
  })

  it('ordena las mesas por etiqueta: el plan del banquete se lee en ese orden', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t2', 'Mesa 02', 8), mesa('t1', 'Mesa 01', 8)] })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.tables.map((t) => t.label)).toEqual(['Mesa 01', 'Mesa 02'])
  })

  it('los grupos sin mesa salen en unseated', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 8)], groups: [grupo('a', 4, null)] })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.unseated.map((g) => g.id)).toEqual(['a'])
  })

  it('un grupo revocado no cuenta como pendiente de sentar', async () => {
    const fake = fakeVenueRepository({ groups: [grupo('a', 4, null, { revoked: true })] })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.unseated).toHaveLength(0)
  })

  it('totalSeats suma el cupo de todas las mesas', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 8), mesa('t2', 'Mesa 02', 6)] })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.totalSeats).toBe(14)
  })

  it('totalConfirmed suma los cupos confirmados, no los cupos repartidos', async () => {
    const fake = fakeVenueRepository({
      groups: [grupo('a', 6, null, { confirmed: 4 }), grupo('b', 4, null, { confirmed: null })],
    })
    const r = await listSeating({ venue: fake.repo })('e1')
    // 4 confirmados; el grupo que aún no responde no come.
    expect(isOk(r) && r.value.totalConfirmed).toBe(4)
  })

  it('un grupo revocado no suma comensales aunque hubiera confirmado', async () => {
    const fake = fakeVenueRepository({ groups: [grupo('a', 4, null, { confirmed: 4, revoked: true })] })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.totalConfirmed).toBe(0)
  })

  it('trae las zonas del salón', async () => {
    const fake = fakeVenueRepository({ zones: [zona] })
    const r = await listSeating({ venue: fake.repo })('e1')
    expect(isOk(r) && r.value.zones.map((z) => z.label)).toEqual(['Pista'])
  })

  it('un salón vacío se lee sin errores', async () => {
    const r = await listSeating({ venue: fakeVenueRepository({}).repo })('e1')
    expect(isOk(r) && r.value.tables).toEqual([])
    expect(isOk(r) && r.value.totalSeats).toBe(0)
  })

  it('un fallo de la base es storage_failure, no una excepción que tumbe la página', async () => {
    const fake = fakeVenueRepository({})
    const roto = { ...fake.repo, listTables: async () => { throw new Error('sin conexión') } }
    const r = await listSeating({ venue: roto })('e1')
    expect(isErr(r) && r.error.kind).toBe('storage_failure')
  })
})
