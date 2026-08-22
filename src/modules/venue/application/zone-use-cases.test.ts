import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { VenueZone } from '../domain/venue-zone'
import { fakeVenueRepository } from './fake-venue-repository'
import { addZone, removeZone, updateZone } from './zone-use-cases'

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

const ids = () => 'nueva'

describe('addZone', () => {
  it('da de alta una zona del salón', async () => {
    const fake = fakeVenueRepository({})
    const r = await addZone({ venue: fake.repo, ids })({
      eventId: 'e1',
      kind: 'bar',
      label: 'Barra',
      x: 10,
      y: 10,
      w: 20,
      h: 8,
    })
    expect(isOk(r)).toBe(true)
    expect(await fake.repo.listZones('e1')).toHaveLength(1)
  })

  it('rechaza una clase que el plano no sabe dibujar', async () => {
    const fake = fakeVenueRepository({})
    const r = await addZone({ venue: fake.repo, ids })({
      eventId: 'e1',
      kind: 'piscina' as unknown as 'bar',
      label: 'Piscina',
      x: 10,
      y: 10,
      w: 20,
      h: 8,
    })
    expect(isErr(r) && r.error.kind).toBe('invalid_kind')
    expect(await fake.repo.listZones('e1')).toHaveLength(0)
  })

  it('a diferencia de las mesas, dos zonas pueden llamarse igual', async () => {
    // Dos barras en un salón grande son normales; la puerta no canta el nombre de una zona.
    const fake = fakeVenueRepository({ zones: [{ ...zona('z1'), kind: 'bar', label: 'Barra' }] })
    const r = await addZone({ venue: fake.repo, ids })({
      eventId: 'e1',
      kind: 'bar',
      label: 'Barra',
      x: 60,
      y: 10,
      w: 20,
      h: 8,
    })
    expect(isOk(r)).toBe(true)
  })
})

describe('updateZone', () => {
  it('cambia la etiqueta y el tamaño', async () => {
    const fake = fakeVenueRepository({ zones: [zona('z1')] })
    const r = await updateZone({ venue: fake.repo })({
      id: 'z1',
      eventId: 'e1',
      kind: 'stage',
      label: 'Tarima',
      x: 5,
      y: 5,
      w: 30,
      h: 10,
    })
    expect(isOk(r) && r.value.label).toBe('Tarima')
    const [row] = await fake.repo.listZones('e1')
    expect(row?.w).toBe(30)
  })

  it('una zona de otro evento devuelve wrong_event', async () => {
    const fake = fakeVenueRepository({ zones: [zona('z1', 'e2')] })
    const r = await updateZone({ venue: fake.repo })({
      id: 'z1',
      eventId: 'e1',
      kind: 'dance',
      label: 'Pista',
      x: 5,
      y: 5,
      w: 10,
      h: 10,
    })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
  })

  it('una zona inexistente devuelve not_found', async () => {
    const fake = fakeVenueRepository({})
    const r = await updateZone({ venue: fake.repo })({
      id: 'nada',
      eventId: 'e1',
      kind: 'dance',
      label: 'Pista',
      x: 5,
      y: 5,
      w: 10,
      h: 10,
    })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

describe('removeZone', () => {
  it('borra la zona del salón', async () => {
    const fake = fakeVenueRepository({ zones: [zona('z1')] })
    expect(isOk(await removeZone({ venue: fake.repo })({ id: 'z1', eventId: 'e1' }))).toBe(true)
    expect(await fake.repo.listZones('e1')).toHaveLength(0)
  })

  it('una zona de otro evento devuelve wrong_event y no se borra', async () => {
    const fake = fakeVenueRepository({ zones: [zona('z1', 'e2')] })
    const r = await removeZone({ venue: fake.repo })({ id: 'z1', eventId: 'e1' })
    expect(isErr(r) && r.error.kind).toBe('wrong_event')
    expect(await fake.repo.listZones('e2')).toHaveLength(1)
  })
})
