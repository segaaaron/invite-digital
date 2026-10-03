import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eventAddons, events } from '@/shared/db/schema'
import { drizzleSaveTheDate as std, EXTRA_SAVE_THE_DATE } from './drizzle-save-the-date'

const eventId = crypto.randomUUID()

beforeAll(async () => {
  await db.insert(events).values({ id: eventId, slug: `std-${eventId.slice(0, 8)}`, title: 'Boda', eventDate: '2027-03-20', rsvpDeadline: '2027-02-27', locale: 'es', themeKey: 'boda-bot', status: 'draft' })
})
afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('el save the date', () => {
  it('se crea, se vuelve a enseñar, resuelve a su evento y otro invalida el anterior', async () => {
    const a = await std.crear(eventId)
    expect(await std.leer(eventId)).toBe(a)
    expect(await std.resolver(a)).toBe(eventId)
    const b = await std.crear(eventId)
    expect(await std.resolver(a)).toBeNull()
    expect(await std.resolver(b)).toBe(eventId)
    await std.quitar(eventId)
    expect(await std.resolver(b)).toBeNull()
  })

  it('se sabe si el evento compró el extra', async () => {
    expect(await std.comprado(eventId)).toBe(false)
    await db.insert(eventAddons).values({ eventId, addonSlug: EXTRA_SAVE_THE_DATE, effect: 'servicio', amount: 0 })
    expect(await std.comprado(eventId)).toBe(true)
  })
})
