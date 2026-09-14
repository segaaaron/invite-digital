import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { arrivals, doorPorters, events, guestGroups } from '@/shared/db/schema'
import { drizzlePorterStore as store } from './drizzle-porter-store'

const eventId = crypto.randomUUID()
const otroEvento = crypto.randomUUID()
const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

const nuevo = (overrides: Partial<Parameters<typeof store.add>[0]> = {}) => ({
  eventId,
  name: 'Carlos',
  phone: '+59170012345',
  gate: 'Puerta 1',
  tokenHash: hash(),
  pinHash: hash(),
  opensHoursBefore: 6,
  closesHoursAfter: 4,
  createdByUserId: null,
  ...overrides,
})

beforeAll(async () => {
  for (const id of [eventId, otroEvento]) {
    await db.insert(events).values({
      id,
      slug: `porteros-${id.slice(0, 8)}`,
      title: 'XV de prueba',
      eventDate: '2026-10-17',
      rsvpDeadline: '2026-10-01',
      locale: 'es',
      themeKey: 'xv',
      status: 'live',
    })
  }
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEvento))
})

describe('porteros contra Postgres', () => {
  it('guarda, lee por su enlace con los datos del evento y cuenta solo los activos', async () => {
    const tokenHash = hash()
    const id = await store.add(nuevo({ tokenHash }))

    const fila = await store.findByTokenHash(tokenHash)
    expect(fila).toMatchObject({ id, eventId, eventTitle: 'XV de prueba', eventDate: '2026-10-17', name: 'Carlos', gate: 'Puerta 1' })

    const antes = await store.countActive(eventId)
    await store.revoke(id, eventId, new Date())
    expect(await store.countActive(eventId)).toBe(antes - 1)
    expect((await store.listActive(eventId)).some((p) => p.id === id)).toBe(false)
  })

  it('no deja quitar un portero desde otro evento', async () => {
    const id = await store.add(nuevo())
    expect(await store.revoke(id, otroEvento, new Date())).toBe(false)
    expect((await store.listActive(eventId)).some((p) => p.id === id)).toBe(true)
  })

  it('los intentos fallidos se suman en la base: diez a la vez son diez, y al quinto bloquea', async () => {
    const id = await store.add(nuevo())
    const bloqueo = new Date(Date.now() + 15 * 60_000)

    await Promise.all(Array.from({ length: 10 }, () => store.registerFailure(id, bloqueo, 5)))

    const [fila] = await db.select().from(doorPorters).where(eq(doorPorters.id, id))
    expect(fila?.failedAttempts).toBe(10)
    expect(fila?.lockedUntil?.getTime()).toBe(bloqueo.getTime())

    await store.resetFailures(id)
    const [limpia] = await db.select().from(doorPorters).where(eq(doorPorters.id, id))
    expect(limpia).toMatchObject({ failedAttempts: 0, lockedUntil: null })
  })

  it('cuenta las llegadas que registró cada portero, sin las deshechas, con la última', async () => {
    const id = await store.add(nuevo())
    const [grupo] = await db
      .insert(guestGroups)
      .values({ eventId, label: 'Familia Rojas', seats: 4, tokenHash: hash() })
      .returning({ id: guestGroups.id })
    const primera = new Date('2026-10-17T23:00:00Z')
    const ultima = new Date('2026-10-17T23:40:00Z')
    await db.insert(arrivals).values([
      { scanId: crypto.randomUUID(), guestGroupId: grupo!.id, arrivedCount: 2, scannedAt: primera, recordedBy: `porter:${id}` },
      { scanId: crypto.randomUUID(), guestGroupId: grupo!.id, arrivedCount: 2, scannedAt: ultima, recordedBy: `porter:${id}` },
      { scanId: crypto.randomUUID(), guestGroupId: grupo!.id, arrivedCount: 2, scannedAt: ultima, recordedBy: `porter:${id}`, voidedAt: ultima },
      { scanId: crypto.randomUUID(), guestGroupId: grupo!.id, arrivedCount: 1, scannedAt: ultima, recordedBy: 'user:alguien' },
    ])

    const resumen = await store.arrivalsByPorter(eventId)

    expect(resumen[id]).toEqual({ registradas: 2, ultima })
  })
})
