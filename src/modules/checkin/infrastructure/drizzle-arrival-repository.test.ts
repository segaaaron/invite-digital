import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups } from '@/shared/db/schema'
import { eq } from 'drizzle-orm'
import { drizzleArrivalRepository, drizzleDoorGroupReader } from './drizzle-arrival-repository'

const eventId = crypto.randomUUID()
const groupId = crypto.randomUUID()
const hash = Buffer.from('0'.repeat(64), 'hex')

beforeAll(async () => {
  await db.insert(events).values({
    id: eventId,
    slug: `puerta-${eventId.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
  await db.insert(guestGroups).values({ id: groupId, eventId, label: 'Familia Prueba', seats: 4, tokenHash: hash })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('drizzleArrivalRepository', () => {
  it('inserta una llegada y la lee por evento', async () => {
    const scanId = crypto.randomUUID()
    const inserted = await drizzleArrivalRepository.insertIfAbsent({
      scanId,
      guestGroupId: groupId,
      arrivedCount: 3,
      scannedAt: new Date(),
      voidedAt: null,
    })
    expect(inserted).toBe(true)
    const rows = await drizzleArrivalRepository.listByEvent(eventId)
    expect(rows.some((r) => r.scanId === scanId)).toBe(true)
  })

  it('el mismo scanId no entra dos veces: la idempotencia vive en la base', async () => {
    const scanId = crypto.randomUUID()
    const row = { scanId, guestGroupId: groupId, arrivedCount: 2, scannedAt: new Date(), voidedAt: null }
    expect(await drizzleArrivalRepository.insertIfAbsent(row)).toBe(true)
    expect(await drizzleArrivalRepository.insertIfAbsent(row)).toBe(false)
  })

  it('deshacer escribe lápida y la fila sigue ahí', async () => {
    const scanId = crypto.randomUUID()
    await drizzleArrivalRepository.insertIfAbsent({
      scanId,
      guestGroupId: groupId,
      arrivedCount: 1,
      scannedAt: new Date(),
      voidedAt: null,
    })
    await drizzleArrivalRepository.void(scanId, new Date())
    const row = await drizzleArrivalRepository.findByScanId(scanId)
    expect(row?.voidedAt).not.toBeNull()
  })

  it('el lector de grupos entrega el hash, y solo el hash', async () => {
    const group = await drizzleDoorGroupReader.findByTokenHash(hash)
    expect(group?.id).toBe(groupId)
    expect(group?.tokenHash.equals(hash)).toBe(true)
    expect(Object.keys(group ?? {})).not.toContain('token')
  })

  it('busca un grupo por su id, para resolver los cupos de una llegada', async () => {
    const group = await drizzleDoorGroupReader.findGroupById(groupId)
    expect(group?.seats).toBe(4)
    expect(await drizzleDoorGroupReader.findGroupById(crypto.randomUUID())).toBeNull()
  })

  it('borrar el evento se lleva las llegadas por cascada', async () => {
    const otro = crypto.randomUUID()
    const otroGrupo = crypto.randomUUID()
    await db.insert(events).values({
      id: otro,
      slug: `puerta-${otro.slice(0, 8)}`,
      title: 'Efímera',
      eventDate: '2026-10-18',
      rsvpDeadline: '2026-10-01',
      locale: 'es',
      themeKey: 'clasico',
      status: 'draft',
    })
    await db.insert(guestGroups).values({
      id: otroGrupo,
      eventId: otro,
      label: 'X',
      seats: 1,
      tokenHash: Buffer.from('1'.repeat(64), 'hex'),
    })
    await drizzleArrivalRepository.insertIfAbsent({
      scanId: crypto.randomUUID(),
      guestGroupId: otroGrupo,
      arrivedCount: 1,
      scannedAt: new Date(),
      voidedAt: null,
    })
    await db.delete(events).where(eq(events.id, otro))
    expect(await drizzleArrivalRepository.listByEvent(otro)).toHaveLength(0)
  })
})
