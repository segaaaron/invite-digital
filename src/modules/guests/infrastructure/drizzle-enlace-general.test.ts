import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { drizzleEnlaceGeneral as enlace } from './drizzle-enlace-general'

const eventId = crypto.randomUUID()

beforeAll(async () => {
  await db.insert(events).values({ id: eventId, slug: `abierta-${eventId.slice(0, 8)}`, title: 'Abierta', eventDate: '2027-01-17', rsvpDeadline: '2026-12-27', locale: 'es', themeKey: 'xv', status: 'live' })
})
afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('el enlace general', () => {
  it('se crea, se vuelve a enseñar y resuelve a su evento; crear otro invalida el anterior', async () => {
    expect(await enlace.leer(eventId)).toBeNull()
    const primero = await enlace.crear(eventId)
    expect(await enlace.leer(eventId)).toBe(primero)
    expect(await enlace.resolver(primero)).toBe(eventId)

    const segundo = await enlace.crear(eventId)
    expect(await enlace.resolver(primero)).toBeNull()
    expect(await enlace.resolver(segundo)).toBe(eventId)
  })

  it('quitado, ya no abre nada; uno inventado tampoco', async () => {
    const token = await enlace.crear(eventId)
    await enlace.quitar(eventId)
    expect(await enlace.resolver(token)).toBeNull()
    expect(await enlace.resolver('inventado')).toBeNull()
  })
})
