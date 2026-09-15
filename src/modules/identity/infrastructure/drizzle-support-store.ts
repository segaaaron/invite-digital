import { and, eq, isNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { sessions, supportSessions } from '@/shared/db/schema'
import type { SupportStore } from '../application/ports'

export const createDrizzleSupportStore = (database: DbExecutor): SupportStore => ({
  async open(input) {
    return database.transaction(async (tx) => {
      // Una sesión, un cliente a la vez: el anterior se cierra en la misma escritura.
      await cerrar(tx, input.sessionId, new Date())
      const [fila] = await tx
        .insert(supportSessions)
        .values({ adminUserId: input.adminUserId, adminEmail: input.adminEmail, clientUserId: input.clientUserId, eventId: input.eventId, reason: input.reason })
        .returning({ id: supportSessions.id })
      if (!fila) throw new Error('No se pudo abrir el modo soporte')
      await tx.update(sessions).set({ supportSessionId: fila.id }).where(eq(sessions.id, input.sessionId))
      return fila.id
    })
  },

  async activeFor(sessionId) {
    const [fila] = await database
      .select({ id: supportSessions.id, adminEmail: supportSessions.adminEmail, clientUserId: supportSessions.clientUserId, eventId: supportSessions.eventId })
      .from(sessions)
      .innerJoin(supportSessions, eq(supportSessions.id, sessions.supportSessionId))
      .where(and(eq(sessions.id, sessionId), isNull(supportSessions.endedAt)))
      .limit(1)
    return fila ?? null
  },

  async close(sessionId, at) {
    return database.transaction((tx) => cerrar(tx, sessionId, at))
  },
})

async function cerrar(tx: DbExecutor, sessionId: string, at: Date): Promise<boolean> {
  const [sesion] = await tx.select({ soporte: sessions.supportSessionId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (!sesion?.soporte) return false
  const cerradas = await tx
    .update(supportSessions)
    .set({ endedAt: at })
    .where(and(eq(supportSessions.id, sesion.soporte), isNull(supportSessions.endedAt)))
    .returning({ id: supportSessions.id })
  await tx.update(sessions).set({ supportSessionId: null }).where(eq(sessions.id, sessionId))
  return cerradas.length > 0
}

export const drizzleSupportStore = createDrizzleSupportStore(db)
