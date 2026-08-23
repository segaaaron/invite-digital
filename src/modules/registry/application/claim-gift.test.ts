import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok, type Result } from '@/shared/result'
import type { GuestError, GuestErrorKind, GuestGroup } from '@/modules/guests'
import type { RegistryError, RegistryErrorKind } from '../domain/errors'
import type { Gift } from '../domain/gift'
import { claimGift, releaseGift } from './claim-gift'
import { fakeRegistryRepository } from './fake-registry-repository'

const EVENTO = 'e1'
const OTRO_EVENTO = 'e2'
const AHORA = new Date('2026-08-21T12:00:00.000Z')

const ANA: GuestGroup = {
  id: 'grupo-ana',
  eventId: EVENTO,
  label: 'Familia Rojas',
  seats: 4,
  revokedAt: null, invitationSentAt: null,
}

const BRUNO: GuestGroup = { ...ANA, id: 'grupo-bruno', label: 'Familia Vargas' }

/** El mismo guardián que usa el RSVP: el token resuelve a un grupo, o no resuelve. */
const resuelve = (group: GuestGroup) => async (): Promise<Result<GuestGroup, GuestError>> => ok(group)
const noResuelve =
  (kind: GuestErrorKind) =>
  async (): Promise<Result<GuestGroup, GuestError>> =>
    err({ kind, detail: `token ${kind}` })

const regalo = (over: Partial<Gift> = {}): Gift => ({
  id: 'g1',
  eventId: EVENTO,
  name: 'Cafetera italiana',
  priceCents: 45_000,
  store: null,
  url: null,
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  ...over,
})

const falla = <T>(result: Result<T, RegistryError>, kind: RegistryErrorKind) => {
  if (isOk(result)) throw new Error(`Se esperaba ${kind}, pero salió bien`)
  expect(result.error.kind).toBe(kind)
}

const bien = <T>(result: Result<T, RegistryError>) => {
  if (isErr(result)) throw new Error(`Se esperaba éxito, llegó ${result.error.kind}: ${result.error.detail}`)
}

describe('claimGift', () => {
  it('el invitado reserva un regalo disponible y queda a su nombre', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    bien(await claimGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }))

    expect(fake.gifts[0]?.status).toBe('reserved')
    expect(fake.gifts[0]?.claimedByGroupId).toBe('grupo-ana')
  })

  it('si la base dice que no quedaban filas por actualizar, es already_claimed', async () => {
    // Cero filas afectadas significa que otro llegó antes. Es la única señal fiable:
    // consultar el estado por separado dejaría una ventana entre las dos consultas.
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    const perdedor = { ...fake.repo, claimIfAvailable: async () => false }
    falla(
      await claimGift({ registry: perdedor, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }),
      'already_claimed',
    )
  })

  it('reservar lo que ya reservó otro da already_claimed', async () => {
    const fake = fakeRegistryRepository({
      gifts: [regalo({ status: 'reserved', claimedByGroupId: 'grupo-ana', claimedAt: AHORA })],
    })
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: resuelve(BRUNO) })({ token: 't', giftId: 'g1' }),
      'already_claimed',
    )
    expect(fake.gifts[0]?.claimedByGroupId).toBe('grupo-ana')
  })

  it('no se puede reservar lo ya comprado', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ status: 'purchased' })] })
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }),
      'already_purchased',
    )
  })

  it('un token desconocido se rechaza con not_found, que arriba es un 404', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: noResuelve('not_found') })({ token: 'x', giftId: 'g1' }),
      'not_found',
    )
    expect(fake.gifts[0]?.status).toBe('available')
  })

  it('un enlace revocado tampoco reserva, y da not_found igual que el desconocido', async () => {
    // Revocado y desconocido responden lo mismo de cara afuera: 404, nunca 403. Un 403
    // confirmaría que el token existe.
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: noResuelve('revoked') })({ token: 'x', giftId: 'g1' }),
      'not_found',
    )
    expect(fake.gifts[0]?.status).toBe('available')
  })

  it('una base caída se distingue del token inválido: storage_failure, no 404', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: noResuelve('storage_failure') })({ token: 'x', giftId: 'g1' }),
      'storage_failure',
    )
  })

  it('un regalo de otro evento da wrong_event', async () => {
    // Un enlace válido de una boda no reserva en la lista de otra.
    const fake = fakeRegistryRepository({ gifts: [regalo({ eventId: OTRO_EVENTO })] })
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }),
      'wrong_event',
    )
    expect(fake.gifts[0]?.status).toBe('available')
  })

  it('un regalo que no existe da not_found', async () => {
    const fake = fakeRegistryRepository({})
    falla(
      await claimGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'fantasma' }),
      'not_found',
    )
  })

  it('un fallo al escribir vuelve como storage_failure, no como excepción', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo()] })
    const roto = { ...fake.repo, claimIfAvailable: async () => { throw new Error('conexión caída') } }
    falla(await claimGift({ registry: roto, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }), 'storage_failure')
  })
})

describe('releaseGift', () => {
  const reservadoPorAna = () => regalo({ status: 'reserved', claimedByGroupId: 'grupo-ana', claimedAt: AHORA })

  it('el invitado suelta el regalo que él reservó', async () => {
    const fake = fakeRegistryRepository({ gifts: [reservadoPorAna()] })
    bien(await releaseGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }))

    expect(fake.gifts[0]?.status).toBe('available')
    expect(fake.gifts[0]?.claimedByGroupId).toBeNull()
  })

  it('liberar el que reservó otro da not_yours y no lo suelta', async () => {
    // Sin esta regla, cualquiera con un enlace válido libera el regalo de otro.
    const fake = fakeRegistryRepository({ gifts: [reservadoPorAna()] })
    falla(
      await releaseGift({ registry: fake.repo, resolveGroup: resuelve(BRUNO) })({ token: 't', giftId: 'g1' }),
      'not_yours',
    )
    expect(fake.gifts[0]?.status).toBe('reserved')
    expect(fake.gifts[0]?.claimedByGroupId).toBe('grupo-ana')
  })

  it('la propiedad la decide la base: cero filas afectadas es not_yours', async () => {
    const fake = fakeRegistryRepository({ gifts: [reservadoPorAna()] })
    const perdedor = { ...fake.repo, releaseIfOwner: async () => false }
    falla(await releaseGift({ registry: perdedor, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }), 'not_yours')
  })

  it('no se puede soltar lo ya comprado', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ status: 'purchased', claimedByGroupId: 'grupo-ana' })] })
    falla(
      await releaseGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }),
      'already_purchased',
    )
  })

  it('un enlace revocado no libera nada: da not_found, no 403', async () => {
    const fake = fakeRegistryRepository({ gifts: [reservadoPorAna()] })
    falla(
      await releaseGift({ registry: fake.repo, resolveGroup: noResuelve('revoked') })({ token: 'x', giftId: 'g1' }),
      'not_found',
    )
    expect(fake.gifts[0]?.status).toBe('reserved')
  })

  it('un regalo de otro evento da wrong_event', async () => {
    const fake = fakeRegistryRepository({ gifts: [regalo({ eventId: OTRO_EVENTO, status: 'reserved' })] })
    falla(
      await releaseGift({ registry: fake.repo, resolveGroup: resuelve(ANA) })({ token: 't', giftId: 'g1' }),
      'wrong_event',
    )
  })
})
