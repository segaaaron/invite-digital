import { eq, sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventStyles } from '@/shared/db/schema'
import { SIN_ESTILO, type EstiloDelEvento } from '../domain/estilo'

/** El estilo de cada evento (`0088`). Sin fila, el del diseño. */
export const drizzleEstilo = {
  async leer(eventId: string): Promise<EstiloDelEvento> {
    const [f] = await db.select().from(eventStyles).where(eq(eventStyles.eventId, eventId)).limit(1)
    return f === undefined ? SIN_ESTILO : { acento: f.accent, caligrafia: f.scriptFont, titulares: f.titleFont }
  },

  async guardar(eventId: string, e: EstiloDelEvento): Promise<void> {
    const valores = { accent: e.acento, scriptFont: e.caligrafia, titleFont: e.titulares, updatedAt: sql`now()` }
    await db.insert(eventStyles).values({ eventId, ...valores }).onConflictDoUpdate({ target: eventStyles.eventId, set: valores })
  },
}
