import { eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventContent } from '@/shared/db/schema'
import type { ContentRepository } from '../application/ports'

export const drizzleContentRepository: ContentRepository = {
  async find(eventId) {
    const [fila] = await db
      .select({ blocks: eventContent.blocks })
      .from(eventContent)
      .where(eq(eventContent.eventId, eventId))
      .limit(1)
    return fila?.blocks ?? null
  },

  /**
   * Escribe el contenido entero, no un bloque.
   *
   * Es un `ON CONFLICT DO UPDATE` sobre la clave primaria: el contenido se lee entero y se
   * edita entero, y hacer un `UPDATE` parcial sobre un `jsonb` obligaría a `jsonb_set` por
   * ruta para ganar nada. Quien decide qué bloques sobreviven es el caso de uso.
   */
  async save(eventId, blocks) {
    await db
      .insert(eventContent)
      .values({ eventId, blocks: blocks as Record<string, unknown> })
      .onConflictDoUpdate({
        target: eventContent.eventId,
        set: { blocks: blocks as Record<string, unknown>, updatedAt: new Date() },
      })
  },

  /** Vacía el contenido sin borrar la fila: la retención pasa por aquí. */
  async clear(eventId) {
    await db.update(eventContent).set({ blocks: {}, updatedAt: new Date() }).where(eq(eventContent.eventId, eventId))
  },
}
