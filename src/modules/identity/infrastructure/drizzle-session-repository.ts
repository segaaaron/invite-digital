import { eq, lt } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { sessions } from '@/shared/db/schema'
import type { SessionRepository } from '../application/ports'

export const createDrizzleSessionRepository = (database: DbExecutor): SessionRepository => ({
  async create(session) {
    await database.insert(sessions).values(session)
  },

  async findByTokenHash(tokenHash) {
    const [row] = await database
      .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt, supportSessionId: sessions.supportSessionId })
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1)
    return row ?? null
  },

  async touch(id, expiresAt) {
    await database.update(sessions).set({ expiresAt }).where(eq(sessions.id, id))
  },

  async deleteByTokenHash(tokenHash) {
    await database.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  },

  async deleteByUser(userId) {
    await database.delete(sessions).where(eq(sessions.userId, userId))
  },

  async deleteExpired(now) {
    const borradas = await database.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id })
    return borradas.length
  },
})

export const drizzleSessionRepository = createDrizzleSessionRepository(db)
