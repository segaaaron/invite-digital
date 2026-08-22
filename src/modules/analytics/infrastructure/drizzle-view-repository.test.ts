import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups, invitationViews } from '@/shared/db/schema'
import { drizzleViewRepository } from './drizzle-view-repository'

const eventId = crypto.randomUUID()
const grupoId = crypto.randomUUID()

const hash = () => Buffer.from(crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'), 'hex')

beforeAll(async () => {
  await db.insert(events).values({
    id: eventId,
    slug: `analitica-${eventId.slice(0, 8)}`,
    title: 'Evento de analítica',
    eventDate: '2027-05-15',
    rsvpDeadline: '2027-05-01',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
  })
  await db.insert(guestGroups).values({ id: grupoId, eventId, label: 'Familia', seats: 2, tokenHash: hash() })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('drizzleViewRepository', () => {
  it('guarda una visita de un grupo y otra sin grupo, y las lee juntas', async () => {
    // La vista de solo lectura del cliente no pertenece a ningún grupo: si la columna
    // fuese obligatoria, esas visitas no se podrían registrar y el total mentiría.
    await drizzleViewRepository.record({
      eventId,
      guestGroupId: grupoId,
      device: 'mobile',
      source: 'whatsapp',
      viewedAt: new Date('2026-08-22T10:00:00Z'),
    })
    await drizzleViewRepository.record({
      eventId,
      guestGroupId: null,
      device: 'desktop',
      source: 'direct',
      viewedAt: new Date('2026-08-22T11:00:00Z'),
    })

    const filas = await drizzleViewRepository.listForEvent(eventId)
    expect(filas).toHaveLength(2)
    expect(filas[0]?.device).toBe('desktop')
    expect(filas[0]?.viewedAt).toBeInstanceOf(Date)
  })

  it('borrar el evento se lleva sus visitas', async () => {
    const otro = crypto.randomUUID()
    await db.insert(events).values({
      id: otro,
      slug: `analitica-borrado-${otro.slice(0, 8)}`,
      title: 'Se borra',
      eventDate: '2027-05-15',
      rsvpDeadline: '2027-05-01',
      locale: 'es',
      themeKey: 'clasico',
      status: 'live',
    })
    await drizzleViewRepository.record({
      eventId: otro,
      guestGroupId: null,
      device: 'tablet',
      source: 'qr',
      viewedAt: new Date(),
    })

    await db.delete(events).where(eq(events.id, otro))

    const quedan = await db.select().from(invitationViews).where(eq(invitationViews.eventId, otro))
    expect(quedan).toHaveLength(0)
  })

  it('la base rechaza una categoría inventada', async () => {
    // El CHECK es la última defensa: si un día alguien escribe directo contra la tabla,
    // la columna no acaba con un valor que el panel no sabe pintar.
    await expect(
      db.insert(invitationViews).values({ eventId, guestGroupId: null, device: 'nevera', source: 'qr' }),
    ).rejects.toThrow()
  })

  it('barre por fecha las visitas viejas', async () => {
    await drizzleViewRepository.record({
      eventId,
      guestGroupId: null,
      device: 'mobile',
      source: 'qr',
      viewedAt: new Date('2020-01-01T00:00:00Z'),
    })

    const borradas = await drizzleViewRepository.deleteOlderThan(new Date('2021-01-01T00:00:00Z'))
    expect(borradas).toBeGreaterThanOrEqual(1)
  })
})
