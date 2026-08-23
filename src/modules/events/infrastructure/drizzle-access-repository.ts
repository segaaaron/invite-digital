import { eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import type { AccessRepository } from '../application/event-access'

export const drizzleAccessRepository: AccessRepository = {
  async setPasswordHash(eventId, hash) {
    await db.update(events).set({ accessPasswordHash: hash }).where(eq(events.id, eventId))
  },

  async passwordHashOf(eventId) {
    const [fila] = await db
      .select({ hash: events.accessPasswordHash })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)
    return fila?.hash ?? null
  },
}
