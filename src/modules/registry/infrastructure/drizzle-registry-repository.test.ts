import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, fundContributions, giftFunds, gifts, guestGroups } from '@/shared/db/schema'
import type { Contribution, Fund } from '../domain/fund'
import type { Gift } from '../domain/gift'
import { drizzleRegistryRepository } from './drizzle-registry-repository'

const eventId = crypto.randomUUID()
const otroEventId = crypto.randomUUID()
const grupoA = crypto.randomUUID()
const grupoB = crypto.randomUUID()

const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

const nuevoEvento = async (id: string) => {
  await db.insert(events).values({
    id,
    slug: `regalos-${id.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
}

const nuevoGrupo = async (id: string, label: string) => {
  await db.insert(guestGroups).values({ id, eventId, label, seats: 4, tokenHash: hash() })
}

const regalo = (over: Partial<Gift> = {}): Gift => ({
  id: crypto.randomUUID(),
  eventId,
  name: 'Cafetera italiana',
  priceCents: 45_000,
  store: 'Casa Ideal',
  url: 'https://casaideal.bo/cafetera',
  status: 'available',
  claimedByGroupId: null,
  claimedAt: null,
  ...over,
})

const fondo = (over: Partial<Fund> = {}): Fund => ({
  id: crypto.randomUUID(),
  eventId,
  name: 'Luna de miel',
  description: 'Pasajes y hotel.',
  goalCents: 500_000,
  ...over,
})

const aporte = (fundId: string, over: Partial<Contribution> = {}): Contribution => ({
  id: crypto.randomUUID(),
  fundId,
  guestGroupId: null,
  displayName: 'Abuela Rosa',
  amountCents: 15_000,
  method: 'envelope',
  message: 'Que sean muy felices.',
  createdAt: new Date('2026-08-20T10:00:00.000Z'),
  ...over,
})

beforeAll(async () => {
  await nuevoEvento(eventId)
  await nuevoEvento(otroEventId)
  await nuevoGrupo(grupoA, 'Familia Rojas')
  await nuevoGrupo(grupoB, 'Familia Vargas')
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEventId))
})

describe('regalos', () => {
  it('inserta un regalo y lo lee por evento', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)

    const rows = await drizzleRegistryRepository.listGifts(eventId)
    const leido = rows.find((r) => r.id === g.id)
    expect(leido?.name).toBe('Cafetera italiana')
    expect(leido?.status).toBe('available')
    expect(leido?.claimedByLabel).toBeNull()
  })

  it('los importes vuelven como enteros, no como cadenas', async () => {
    // `integer` de Postgres llega como number; si alguna vez la columna pasara a
    // `numeric`, el driver devolvería "45000" y la aritmética del progreso concatenaría
    // en vez de sumar.
    const g = regalo({ priceCents: 45_000 })
    await drizzleRegistryRepository.insertGift(g)

    const leido = await drizzleRegistryRepository.findGift(g.id)
    expect(leido?.priceCents).toBe(45_000)
    expect(typeof leido?.priceCents).toBe('number')
  })

  it('no mezcla los regalos de dos eventos', async () => {
    const mio = regalo()
    const ajeno = regalo({ eventId: otroEventId })
    await drizzleRegistryRepository.insertGift(mio)
    await drizzleRegistryRepository.insertGift(ajeno)

    const ids = (await drizzleRegistryRepository.listGifts(eventId)).map((r) => r.id)
    expect(ids).toContain(mio.id)
    expect(ids).not.toContain(ajeno.id)
  })

  it('edita el regalo sin tocar su reserva', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    const reservado = await drizzleRegistryRepository.findGift(g.id)
    if (!reservado) throw new Error('el regalo debería existir')
    await drizzleRegistryRepository.updateGift({ ...reservado, name: 'Cafetera de émbolo', priceCents: 32_000 })

    const leido = await drizzleRegistryRepository.findGift(g.id)
    expect(leido?.name).toBe('Cafetera de émbolo')
    expect(leido?.status).toBe('reserved')
    expect(leido?.claimedByGroupId).toBe(grupoA)
  })

  it('borra el regalo', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.deleteGift(g.id)
    expect(await drizzleRegistryRepository.findGift(g.id)).toBeNull()
  })

  it('el reservado llega con la etiqueta del grupo, no solo con su id', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    const leido = (await drizzleRegistryRepository.listGifts(eventId)).find((r) => r.id === g.id)
    expect(leido?.claimedByLabel).toBe('Familia Rojas')
  })

  it('borrar un grupo no borra el regalo: lo deja sin dueño', async () => {
    const grupoEfimero = crypto.randomUUID()
    await nuevoGrupo(grupoEfimero, 'Grupo que se va')
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoEfimero)

    await db.delete(guestGroups).where(eq(guestGroups.id, grupoEfimero))

    const leido = await drizzleRegistryRepository.findGift(g.id)
    expect(leido).not.toBeNull()
    expect(leido?.claimedByGroupId).toBeNull()
  })
})

describe('la carrera por el mismo regalo', () => {
  it('dos invitados reservando a la vez: solo uno gana', async () => {
    // La prueba que justifica el UPDATE condicional. Con un SELECT previo, las dos
    // reservas pasarían y el fallo no aparecería jamás en desarrollo.
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)

    const [a, b] = await Promise.all([
      drizzleRegistryRepository.claimIfAvailable(g.id, grupoA),
      drizzleRegistryRepository.claimIfAvailable(g.id, grupoB),
    ])

    expect([a, b].filter(Boolean)).toHaveLength(1)

    const leido = await drizzleRegistryRepository.findGift(g.id)
    expect(leido?.status).toBe('reserved')
    expect([grupoA, grupoB]).toContain(leido?.claimedByGroupId)
  })

  it('diez a la vez sobre el mismo regalo y sigue ganando exactamente uno', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)

    const resultados = await Promise.all(
      Array.from({ length: 10 }, (_, i) => drizzleRegistryRepository.claimIfAvailable(g.id, i % 2 === 0 ? grupoA : grupoB)),
    )

    expect(resultados.filter(Boolean)).toHaveLength(1)
  })

  it('reservar deja constancia del instante', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    expect((await drizzleRegistryRepository.findGift(g.id))?.claimedAt).toBeInstanceOf(Date)
  })

  it('no se reserva lo que ya está reservado', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)

    expect(await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)).toBe(true)
    expect(await drizzleRegistryRepository.claimIfAvailable(g.id, grupoB)).toBe(false)
  })

  it('no se reserva lo ya comprado, aunque nadie lo hubiera apartado', async () => {
    const g = regalo({ status: 'purchased' })
    await drizzleRegistryRepository.insertGift(g)
    expect(await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)).toBe(false)
  })

  it('un regalo que no existe no se reserva ni revienta', async () => {
    expect(await drizzleRegistryRepository.claimIfAvailable(crypto.randomUUID(), grupoA)).toBe(false)
  })

  it('liberar exige ser el dueño: el de otro no se suelta', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    expect(await drizzleRegistryRepository.releaseIfOwner(g.id, grupoB)).toBe(false)

    const leido = await drizzleRegistryRepository.findGift(g.id)
    expect(leido?.status).toBe('reserved')
    expect(leido?.claimedByGroupId).toBe(grupoA)
  })

  it('el dueño sí lo suelta, y queda libre del todo', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    expect(await drizzleRegistryRepository.releaseIfOwner(g.id, grupoA)).toBe(true)

    const leido = await drizzleRegistryRepository.findGift(g.id)
    expect(leido?.status).toBe('available')
    expect(leido?.claimedByGroupId).toBeNull()
    expect(leido?.claimedAt).toBeNull()
  })

  it('soltar dos veces: la segunda ya no afecta a ninguna fila', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    expect(await drizzleRegistryRepository.releaseIfOwner(g.id, grupoA)).toBe(true)
    expect(await drizzleRegistryRepository.releaseIfOwner(g.id, grupoA)).toBe(false)
  })

  it('el dueño tampoco suelta lo que ya se compró', async () => {
    const g = regalo()
    await drizzleRegistryRepository.insertGift(g)
    await drizzleRegistryRepository.claimIfAvailable(g.id, grupoA)

    const reservado = await drizzleRegistryRepository.findGift(g.id)
    if (!reservado) throw new Error('el regalo debería existir')
    await drizzleRegistryRepository.updateGift({ ...reservado, status: 'purchased' })

    expect(await drizzleRegistryRepository.releaseIfOwner(g.id, grupoA)).toBe(false)
  })
})

describe('fondos y aportaciones', () => {
  it('inserta un fondo y lo lee por evento', async () => {
    const f = fondo()
    await drizzleRegistryRepository.insertFund(f)

    const leido = (await drizzleRegistryRepository.listFunds(eventId)).find((r) => r.id === f.id)
    expect(leido?.goalCents).toBe(500_000)
    expect(typeof leido?.goalCents).toBe('number')
    expect(leido?.description).toBe('Pasajes y hotel.')
  })

  it('edita el fondo', async () => {
    const f = fondo()
    await drizzleRegistryRepository.insertFund(f)
    await drizzleRegistryRepository.updateFund({ ...f, name: 'Luna de miel en Rurrenabaque', goalCents: 250_000 })

    const leido = await drizzleRegistryRepository.findFund(f.id)
    expect(leido?.name).toBe('Luna de miel en Rurrenabaque')
    expect(leido?.goalCents).toBe(250_000)
  })

  it('los importes de las aportaciones vuelven como enteros', async () => {
    const f = fondo()
    await drizzleRegistryRepository.insertFund(f)
    await drizzleRegistryRepository.insertContribution(aporte(f.id, { amountCents: 15_000 }))

    const [leida] = await drizzleRegistryRepository.listContributions(f.id)
    expect(leida?.amountCents).toBe(15_000)
    expect(typeof leida?.amountCents).toBe('number')
    expect(leida?.createdAt).toBeInstanceOf(Date)
  })

  it('acepta una aportación sin grupo: la abuela del sobre no tiene enlace', async () => {
    const f = fondo()
    await drizzleRegistryRepository.insertFund(f)
    await drizzleRegistryRepository.insertContribution(aporte(f.id, { guestGroupId: null }))

    expect((await drizzleRegistryRepository.listContributions(f.id))[0]?.guestGroupId).toBeNull()
  })

  it('conserva el grupo cuando quien aporta sí es un invitado con enlace', async () => {
    const f = fondo()
    await drizzleRegistryRepository.insertFund(f)
    await drizzleRegistryRepository.insertContribution(aporte(f.id, { guestGroupId: grupoA }))

    expect((await drizzleRegistryRepository.listContributions(f.id))[0]?.guestGroupId).toBe(grupoA)
  })

  it('borrar el fondo arrastra sus contribuciones', async () => {
    const f = fondo()
    await drizzleRegistryRepository.insertFund(f)
    await drizzleRegistryRepository.insertContribution(aporte(f.id))
    await drizzleRegistryRepository.insertContribution(aporte(f.id))

    await drizzleRegistryRepository.deleteFund(f.id)

    expect(await drizzleRegistryRepository.findFund(f.id)).toBeNull()
    const huerfanas = await db.select().from(fundContributions).where(eq(fundContributions.fundId, f.id))
    expect(huerfanas).toEqual([])
  })

  it('borrar el evento se lleva regalos, fondos y aportaciones', async () => {
    // La cascada desde `events` es lo que impide que un evento borrado deje contabilidad
    // suelta apuntando a una boda que ya no existe.
    const efimero = crypto.randomUUID()
    await nuevoEvento(efimero)
    const f = fondo({ eventId: efimero })
    await drizzleRegistryRepository.insertFund(f)
    await drizzleRegistryRepository.insertContribution(aporte(f.id))
    await drizzleRegistryRepository.insertGift(regalo({ eventId: efimero }))

    await db.delete(events).where(eq(events.id, efimero))

    expect(await db.select().from(giftFunds).where(eq(giftFunds.eventId, efimero))).toEqual([])
    expect(await db.select().from(gifts).where(eq(gifts.eventId, efimero))).toEqual([])
    expect(await db.select().from(fundContributions).where(eq(fundContributions.fundId, f.id))).toEqual([])
  })
})
