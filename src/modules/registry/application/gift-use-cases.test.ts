import { describe, expect, it } from 'vitest'
import { isErr, isOk, type Result } from '@/shared/result'
import type { RegistryError, RegistryErrorKind } from '../domain/errors'
import type { Gift } from '../domain/gift'
import { fakeRegistryRepository } from './fake-registry-repository'
import { addGift, markPurchased, releaseGiftAsAtelier, removeGift, updateGift } from './gift-use-cases'

const EVENTO = 'e1'
const OTRO_EVENTO = 'e2'
const AHORA = new Date('2026-08-21T12:00:00.000Z')

let contador = 0
const ids = () => `id-${(contador += 1)}`

const regalo = (over: Partial<Gift> = {}): Gift => ({
  id: 'g1',
  eventId: EVENTO,
  name: 'Cafetera italiana',
  priceCents: 45_000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/cafetera',
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  ...over,
})

const falla = <T>(result: Result<T, RegistryError>, kind: RegistryErrorKind) => {
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero salió bien`)
  expect(result.error.kind).toBe(kind)
}

const valor = <T>(result: Result<T, RegistryError>): T => {
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}: ${result.error.detail}`)
  return result.value
}

describe('addGift', () => {
  it('da de alta el regalo y lo deja disponible', async () => {
    const fake = fakeRegistryRepository({})
    const g = valor(
      await addGift({ registry: fake.repo, ids })({
        eventId: EVENTO,
        name: 'Cafetera italiana',
        priceCents: 45_000,
        store: 'Casa Ideal',
        url: 'https://casaideal.bo/cafetera',
      }),
    )

    expect(g.status).toBe('available')
    expect(fake.gifts).toHaveLength(1)
    expect(fake.gifts[0]?.name).toBe('Cafetera italiana')
  })

  it('rechaza un importe inválido antes de tocar la base', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await addGift({ registry: fake.repo, ids })({
        eventId: EVENTO,
        name: 'Cafetera',
        priceCents: 0,
        store: null,
        url: null,
      }),
      'invalid_amount',
    )
    expect(fake.gifts).toHaveLength(0)
  })

  it('rechaza un nombre vacío antes de tocar la base', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await addGift({ registry: fake.repo, ids })({ eventId: EVENTO, name: '  ', priceCents: 100, store: null, url: null }),
      'invalid_name',
    )
    expect(fake.gifts).toHaveLength(0)
  })

  it('rechaza una URL de tienda que no sea http ni https, y no escribe nada', async () => {
    // Un `javascript:` en ese campo sería un agujero abierto por el propio panel.
    const fake = fakeRegistryRepository({})
    falla(
      await addGift({ registry: fake.repo, ids })({
        eventId: EVENTO,
        name: 'Cafetera',
        priceCents: 100,
        store: null,
        url: 'javascript:alert(document.cookie)',
      }),
      'invalid_url',
    )
    expect(fake.gifts).toHaveLength(0)
  })

  it('un fallo de la base vuelve como storage_failure, no como excepción', async () => {
    const fake = fakeRegistryRepository({})
    const roto = { ...fake.repo, insertGift: async () => { throw new Error('conexión caída') } }
    falla(
      await addGift({ registry: roto, ids })({ eventId: EVENTO, name: 'Cafetera', priceCents: 100, store: null, url: null }),
      'storage_failure',
    )
  })
})

describe('updateGift', () => {
  it('cambia nombre, precio y enlace', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    const g = valor(
      await updateGift({ registry: fake.repo })({
        id: 'g1',
        eventId: EVENTO,
        name: 'Cafetera de émbolo',
        priceCents: 32_000,
        store: null,
        url: null,
      }),
    )
    expect(g.name).toBe('Cafetera de émbolo')
    expect(fake.gifts[0]?.priceCents).toBe(32_000)
  })

  it('conserva el estado y la reserva: editar el precio no libera el regalo', async () => {
    const reservado = regalo({ status: 'reserved', claimedByGroupId: 'grupo-ana', claimedAt: AHORA })
    const fake = fakeRegistryRepository({ gifts: [reservado] })
    const g = valor(
      await updateGift({ registry: fake.repo })({
        id: 'g1',
        eventId: EVENTO,
        name: 'Cafetera',
        priceCents: 50_000,
        store: null,
        url: null,
      }),
    )
    expect(g.status).toBe('reserved')
    expect(g.claimedByGroupId).toBe('grupo-ana')
  })

  it('un regalo de otro evento da wrong_event', async () => {
    // La UI puede mentir; un id copiado de otra lista no puede editar este regalo.
    const fake = fakeRegistryRepository({ gifts: [regalo({ eventId: OTRO_EVENTO })] })
    falla(
      await updateGift({ registry: fake.repo })({
        id: 'g1',
        eventId: EVENTO,
        name: 'Cafetera',
        priceCents: 100,
        store: null,
        url: null,
      }),
      'wrong_event',
    )
  })

  it('un regalo que no existe da not_found', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await updateGift({ registry: fake.repo })({
        id: 'fantasma',
        eventId: EVENTO,
        name: 'Cafetera',
        priceCents: 100,
        store: null,
        url: null,
      }),
      'not_found',
    )
  })
})

describe('removeGift', () => {
  it('borra el regalo de la lista', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    valor(await removeGift({ registry: fake.repo })({ id: 'g1', eventId: EVENTO }))
    expect(fake.gifts).toHaveLength(0)
  })

  it('no borra el regalo de otro evento', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ eventId: OTRO_EVENTO })] })
    falla(await removeGift({ registry: fake.repo })({ id: 'g1', eventId: EVENTO }), 'wrong_event')
    expect(fake.gifts).toHaveLength(1)
  })
})

describe('markPurchased', () => {
  it('marca comprado uno reservado y conserva quién lo reservó', async () => {
    const fake = fakeRegistryRepository({
      gifts: [regalo({ status: 'reserved', claimedByGroupId: 'grupo-ana', claimedAt: AHORA })],
    })
    const g = valor(await markPurchased({ registry: fake.repo, clock: () => AHORA })({ id: 'g1', eventId: EVENTO }))
    expect(g.status).toBe('purchased')
    expect(g.claimedByGroupId).toBe('grupo-ana')
  })

  it('marca comprado uno que llegó sin reservar', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    expect(valor(await markPurchased({ registry: fake.repo, clock: () => AHORA })({ id: 'g1', eventId: EVENTO })).status).toBe(
      'purchased',
    )
  })

  it('lo ya comprado da already_purchased y no se vuelve a escribir', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ status: 'purchased' })] })
    falla(await markPurchased({ registry: fake.repo, clock: () => AHORA })({ id: 'g1', eventId: EVENTO }), 'already_purchased')
  })

  it('un regalo de otro evento da wrong_event', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ eventId: OTRO_EVENTO })] })
    falla(await markPurchased({ registry: fake.repo, clock: () => AHORA })({ id: 'g1', eventId: EVENTO }), 'wrong_event')
  })
})

describe('releaseGiftAsAtelier', () => {
  it('el atelier libera la reserva de cualquiera', async () => {
    const fake = fakeRegistryRepository({
      gifts: [regalo({ status: 'reserved', claimedByGroupId: 'grupo-ana', claimedAt: AHORA })],
    })
    const g = valor(await releaseGiftAsAtelier({ registry: fake.repo, clock: () => AHORA })({ id: 'g1', eventId: EVENTO }))
    expect(g.status).toBe('available')
    expect(g.claimedByGroupId).toBeNull()
  })

  it('no libera lo comprado: comprado es definitivo', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ status: 'purchased' })] })
    falla(
      await releaseGiftAsAtelier({ registry: fake.repo, clock: () => AHORA })({ id: 'g1', eventId: EVENTO }),
      'already_purchased',
    )
  })
})
