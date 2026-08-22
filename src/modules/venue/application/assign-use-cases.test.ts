import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { VenueTable } from '../domain/venue-table'
import { assignGroup, autoAssignGroups, unassignGroup } from './assign-use-cases'
import { fakeVenueRepository } from './fake-venue-repository'
import type { SeatedGroupRow } from './ports'

const mesa = (id: string, label: string, capacity: number, eventId = 'e1'): VenueTable => ({
  id,
  eventId,
  label,
  capacity,
  shape: 'round',
  x: 50,
  y: 50,
})

const grupo = (id: string, seats: number, tableId: string | null = null, eventId = 'e1'): SeatedGroupRow => ({
  id,
  eventId,
  label: `Familia ${id}`,
  seats,
  tableId,
  revoked: false,
  confirmed: seats,
})

describe('assignGroup', () => {
  it('sienta un grupo que cabe', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 8)], groups: [grupo('g1', 4)] })
    const r = await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' })
    expect(isOk(r)).toBe(true)
    const [g] = await fake.repo.listSeatedGroups('e1')
    expect(g?.tableId).toBe('t1')
  })

  it('un grupo que no cabe entero se rechaza y dice cuántos sitios faltan', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 8)],
      groups: [grupo('ya', 6, 't1'), grupo('g1', 4)],
    })
    const r = await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' })
    expect(isErr(r) && r.error.kind).toBe('does_not_fit')
    expect(isErr(r) && r.error.detail).toContain('2')
  })

  it('no parte el grupo: si no cabe, el grupo se queda como estaba', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 4)],
      groups: [grupo('ya', 3, 't1'), grupo('g1', 4)],
    })
    await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' })
    const groups = await fake.repo.listSeatedGroups('e1')
    expect(groups.find((g) => g.id === 'g1')?.tableId).toBeNull()
  })

  it('cabe justo', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 8)],
      groups: [grupo('ya', 4, 't1'), grupo('g1', 4)],
    })
    expect(isOk(await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' }))).toBe(true)
  })

  it('reasignar a la misma mesa no falla por «no cabe»', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 4)], groups: [grupo('g1', 4, 't1')] })
    expect(isOk(await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' }))).toBe(true)
  })

  it('una mesa de otro evento devuelve wrong_event', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 8, 'e2')], groups: [grupo('g1', 2)] })
    const r = await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
  })

  it('un grupo de otro evento devuelve wrong_event', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 8)],
      groups: [grupo('g1', 2, null, 'e2')],
    })
    const r = await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 't1' })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
  })

  it('una mesa inexistente devuelve not_found', async () => {
    const fake = fakeVenueRepository({ groups: [grupo('g1', 2)] })
    const r = await assignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1', tableId: 'nada' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

describe('unassignGroup', () => {
  it('deja el grupo sin mesa', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 8)], groups: [grupo('g1', 4, 't1')] })
    const r = await unassignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1' })
    expect(isOk(r)).toBe(true)
    const [g] = await fake.repo.listSeatedGroups('e1')
    expect(g?.tableId).toBeNull()
  })

  it('el grupo sigue existiendo: quitarle la mesa no lo borra', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 8)], groups: [grupo('g1', 4, 't1')] })
    await unassignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1' })
    expect(await fake.repo.listSeatedGroups('e1')).toHaveLength(1)
  })

  it('un grupo de otro evento devuelve wrong_event', async () => {
    const fake = fakeVenueRepository({ groups: [grupo('g1', 4, 't1', 'e2')] })
    const r = await unassignGroup({ venue: fake.repo })({ eventId: 'e1', groupId: 'g1' })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
  })
})

describe('autoAssignGroups', () => {
  it('reparte los sueltos y no toca los colocados a mano', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 4), mesa('t2', 'Mesa 02', 4)],
      groups: [grupo('a', 4, 't1'), grupo('b', 4)],
    })
    const r = await autoAssignGroups({ venue: fake.repo })({ eventId: 'e1' })
    expect(isOk(r) && r.value.assigned).toBe(1)
    const groups = await fake.repo.listSeatedGroups('e1')
    expect(groups.find((g) => g.id === 'a')?.tableId).toBe('t1')
    expect(groups.find((g) => g.id === 'b')?.tableId).toBe('t2')
  })

  it('persiste solo las asignaciones nuevas: una escritura por grupo colocado', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 8)],
      groups: [grupo('a', 4, 't1'), grupo('b', 2)],
    })
    const escrituras: string[] = []
    const espia = {
      ...fake.repo,
      setGroupTable: async (groupId: string, tableId: string | null) => {
        escrituras.push(groupId)
        await fake.repo.setGroupTable(groupId, tableId)
      },
    }
    await autoAssignGroups({ venue: espia })({ eventId: 'e1' })
    expect(escrituras).toEqual(['b'])
  })

  it('informa de quien no cabe en ninguna mesa', async () => {
    const fake = fakeVenueRepository({ tables: [mesa('t1', 'Mesa 01', 2)], groups: [grupo('a', 6)] })
    const r = await autoAssignGroups({ venue: fake.repo })({ eventId: 'e1' })
    expect(isOk(r) && r.value.assigned).toBe(0)
    expect(isOk(r) && r.value.unplaced.map((u) => u.label)).toEqual(['Familia a'])
  })

  it('no reparte grupos revocados: quien ya no está invitado no ocupa sitio', async () => {
    const fake = fakeVenueRepository({
      tables: [mesa('t1', 'Mesa 01', 8)],
      groups: [{ ...grupo('a', 4), revoked: true }],
    })
    const r = await autoAssignGroups({ venue: fake.repo })({ eventId: 'e1' })
    expect(isOk(r) && r.value.assigned).toBe(0)
    expect(isOk(r) && r.value.unplaced).toHaveLength(0)
  })

  it('sin mesas no escribe nada y devuelve a todos como sin colocar', async () => {
    const fake = fakeVenueRepository({ groups: [grupo('a', 4)] })
    const r = await autoAssignGroups({ venue: fake.repo })({ eventId: 'e1' })
    expect(isOk(r) && r.value.unplaced).toHaveLength(1)
  })
})
