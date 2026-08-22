import { describe, expect, it } from 'vitest'
import { isErr } from '@/shared/result'
import type { Contribution, Fund } from '../domain/fund'
import type { Gift } from '../domain/gift'
import { fakeRegistryRepository } from './fake-registry-repository'
import { listRegistry } from './list-registry'

const EVENTO = 'e1'
const AHORA = new Date('2026-08-21T12:00:00.000Z')

const regalo = (id: string, over: Partial<Gift> = {}): Gift => ({
  id,
  eventId: EVENTO,
  name: `Regalo ${id}`,
  priceCents: 45_000,
  store: null,
  url: null,
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  ...over,
})

const fondo = (id: string, goalCents: number): Fund => ({
  id,
  eventId: EVENTO,
  name: `Fondo ${id}`,
  description: null,
  goalCents,
})

const aporte = (fundId: string, amountCents: number): Contribution => ({
  id: crypto.randomUUID(),
  fundId,
  guestGroupId: null,
  displayName: 'Abuela Rosa',
  amountCents,
  method: 'envelope',
  message: null,
  createdAt: AHORA,
})

const vista = async (fake: ReturnType<typeof fakeRegistryRepository>) => {
  const result = await listRegistry({ registry: fake.repo })(EVENTO)
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}: ${result.error.detail}`)
  return result.value
}

describe('listRegistry', () => {
  it('devuelve los regalos del evento y solo los de ese evento', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo('g1'), regalo('g2', { eventId: 'otro' })] })
    const v = await vista(fake)
    expect(v.gifts.map((g) => g.id)).toEqual(['g1'])
  })

  it('el reservado llega con la etiqueta del grupo que lo reservó', async () => {
    const fake = fakeRegistryRepository({
      gifts: [regalo('g1', { status: 'reserved', claimedByGroupId: 'grupo-ana', claimedAt: AHORA })],
      labels: new Map([['grupo-ana', 'Familia Rojas']]),
    })
    expect((await vista(fake)).gifts[0]?.claimedByLabel).toBe('Familia Rojas')
  })

  it('devuelve los fondos con su progreso ya calculado', async () => {
    const fake = fakeRegistryRepository({
      funds: [fondo('f1', 100_000)],
      contributions: [aporte('f1', 30_000), aporte('f1', 20_000)],
    })
    const v = await vista(fake)
    expect(v.funds[0]?.progress).toEqual({ raisedCents: 50_000, goalCents: 100_000, percent: 50, exceeded: false })
  })

  it('el fondo trae sus aportaciones, para poder agradecerlas una a una', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo('f1', 100_000)], contributions: [aporte('f1', 30_000)] })
    expect((await vista(fake)).funds[0]?.contributions).toHaveLength(1)
  })

  it('la meta superada se recorta al 100 también aquí', async () => {
    const fake = fakeRegistryRepository({ funds: [fondo('f1', 100_000)], contributions: [aporte('f1', 400_000)] })
    const p = (await vista(fake)).funds[0]?.progress
    expect(p?.percent).toBe(100)
    expect(p?.exceeded).toBe(true)
  })

  it('cuenta cuánto queda por reservar, que es lo que el atelier mira de un vistazo', async () => {
    const fake = fakeRegistryRepository({
      gifts: [
        regalo('g1'),
        regalo('g2', { status: 'reserved', claimedByGroupId: 'x', claimedAt: AHORA }),
        regalo('g3', { status: 'purchased' }),
      ],
    })
    const v = await vista(fake)
    expect(v.tally).toEqual({ total: 3, available: 1, reserved: 1, purchased: 1 })
  })

  it('sin nada cargado no falla: devuelve listas vacías', async () => {
    const v = await vista(fakeRegistryRepository({}))
    expect(v.gifts).toEqual([])
    expect(v.funds).toEqual([])
    expect(v.tally).toEqual({ total: 0, available: 0, reserved: 0, purchased: 0 })
  })

  it('un fallo de la base vuelve como storage_failure', async () => {
    const fake = fakeRegistryRepository({})
    const roto = { ...fake.repo, listGifts: async () => { throw new Error('conexión caída') } }
    const result = await listRegistry({ registry: roto })(EVENTO)
    if (!isErr(result)) throw new Error('debería fallar')
    expect(result.error.kind).toBe('storage_failure')
  })
})
