import { eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventMedia } from '@/shared/db/schema'
import type { MediaRepository } from '../application/ports'

const COLUMNAS = {
  id: eventMedia.id,
  eventId: eventMedia.eventId,
  contentType: eventMedia.contentType,
  originalName: eventMedia.originalName,
  byteSize: eventMedia.byteSize,
}

export const drizzleMediaRepository: MediaRepository = {
  async insert(row) {
    await db.insert(eventMedia).values(row)
  },

  async find(id) {
    const [fila] = await db.select(COLUMNAS).from(eventMedia).where(eq(eventMedia.id, id)).limit(1)
    return fila ?? null
  },

  async listByEvent(eventId) {
    return db.select(COLUMNAS).from(eventMedia).where(eq(eventMedia.eventId, eventId))
  },

  async remove(id) {
    await db.delete(eventMedia).where(eq(eventMedia.id, id))
  },
}
