import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { VenueTable } from '../domain/venue-table'
import { fakeVenueRepository } from './fake-venue-repository'
import type { SeatedGroupRow } from './ports'
import { addTable, removeTable, updateTable } from './table-use-cases'

const mesa = (id: string, label: string, eventId = 'e1', capacity = 8): VenueTable => ({
  id,
  eventId,
  label,
  capacity,
  shape: 'round',
  x: 50,
  y: 50,
})

const grupo = (id: string, tableId: string | null, eventId = 'e1'): SeatedGroupRow => ({
  id,
  eventId,
  label: `Familia ${id}`,
  seats: 2,
  tableId,
  revoked: false,
  confirmed: 2,
})

const ids = () => 'nuevo'

describe('addTable', () => {
  it('da de alta una mesa del evento', async () => {
    const fake = fakeVenueRepository({})
    const r = await addTable({ venue: fake.repo, ids })({
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 8,
      shape: 'round',
    })
    expect(isOk(r) && r.value.label).toBe('Mesa 01')
    expect(await fake.repo.listTables('e1')).toHaveLength(1)
  })

  it('rechaza una etiqueta repetida en el mismo evento', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01')] })
    const r = await addTable({ venue: fake.repo, ids })({
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 8,
      shape: 'round',
    })
    expect(isErr(r) && r.error.kind).toBe('duplicate_label')
  })

  it('ve «Mesa 01 » y «Mesa 01» como la misma etiqueta', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01')] })
    const r = await addTable({ venue: fake.repo, ids })({
      eventId: 'e1',
      label: '  Mesa 01  ',
      capacity: 8,
      shape: 'round',
    })
    expect(isErr(r) && r.error.kind).toBe('duplicate_label')
  })

  it('la misma etiqueta en otro evento sí se acepta: cada salón es suyo', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 'e2')] })
    const r = await addTable({ venue: fake.repo, ids })({
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 8,
      shape: 'round',
    })
    expect(isOk(r)).toBe(true)
  })

  it('rechaza un cupo inválido antes de tocar la base', async () => {
    const fake = fakeVenueRepository({})
    const r = await addTable({ venue: fake.repo, ids })({ eventId: 'e1', label: 'Mesa 01', capacity: 0, shape: 'round' })
    expect(isErr(r) && r.error.kind).toBe('invalid_capacity')
    expect(await fake.repo.listTables('e1')).toHaveLength(0)
  })

  it('convierte un fallo de la base en storage_failure, no en una excepción', async () => {
    const fake = fakeVenueRepository({})
    const roto = { ...fake.repo, insertTable: async () => { throw new Error('sin conexión') } }
    const r = await addTable({ venue: roto, ids })({ eventId: 'e1', label: 'Mesa 01', capacity: 8, shape: 'round' })
    expect(isErr(r) && r.error.kind).toBe('storage_failure')
  })
})

describe('updateTable', () => {
  it('cambia el cupo y la etiqueta', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01')] })
    const r = await updateTable({ venue: fake.repo })({
      id: 't1',
      eventId: 'e1',
      label: 'Mesa de honor',
      capacity: 12,
      shape: 'imperial',
    })
    expect(isOk(r) && r.value.capacity).toBe(12)
    const [row] = await fake.repo.listTables('e1')
    expect(row?.label).toBe('Mesa de honor')
  })

  it('una mesa de otro evento devuelve wrong_event', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 'e2')] })
    const r = await updateTable({ venue: fake.repo })({
      id: 't1',
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 8,
      shape: 'round',
    })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
  })

  it('una mesa inexistente devuelve not_found', async () => {
    const fake = fakeVenueRepository({})
    const r = await updateTable({ venue: fake.repo })({
      id: 'nada',
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 8,
      shape: 'round',
    })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })

  it('conserva su propia etiqueta al editarse: no choca consigo misma', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01')] })
    const r = await updateTable({ venue: fake.repo })({
      id: 't1',
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 10,
      shape: 'round',
    })
    expect(isOk(r)).toBe(true)
  })

  it('rechaza tomar la etiqueta de otra mesa del mismo evento', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01'), mesa('t2', 'Mesa 02')] })
    const r = await updateTable({ venue: fake.repo })({
      id: 't2',
      eventId: 'e1',
      label: 'Mesa 01',
      capacity: 8,
      shape: 'round',
    })
    expect(isErr(r) && r.error.kind).toBe('duplicate_label')
  })
})

describe('removeTable', () => {
  it('borra la mesa e informa de cuántos grupos quedaron sin sitio', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01')],
      groups: [grupo('g1', 't1'), grupo('g2', 't1'), grupo('g3', null)],
    })
    const r = await removeTable({ venue: fake.repo })({ id: 't1', eventId: 'e1' })
    expect(isOk(r) && r.value.orphaned).toBe(2)
    expect(await fake.repo.listTables('e1')).toHaveLength(0)
  })

  it('los grupos sobreviven sin mesa: borrar una mesa nunca borra invitados', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01')], groups: [grupo('g1', 't1')] })
    await removeTable({ venue: fake.repo })({ id: 't1', eventId: 'e1' })
    const groups = await fake.repo.listSeatedGroups('e1')
    expect(groups).toHaveLength(1)
    expect(groups[0]?.tableId).toBeNull()
  })

  it('una mesa de otro evento devuelve wrong_event y no se borra', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 'e2')] })
    const r = await removeTable({ venue: fake.repo })({ id: 't1', eventId: 'e1' })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
    expect(await fake.repo.listTables('e2')).toHaveLength(1)
  })

  it('una mesa inexistente devuelve not_found', async () => {
    const fake = fakeVenueRepository({})
    const r = await removeTable({ venue: fake.repo })({ id: 'nada', eventId: 'e1' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})
