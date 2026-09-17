import { and, desc, eq, isNull, lt, ne, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { sessions } from '@/shared/db/schema'
import type { SessionRepository } from '../application/ports'

export const createDrizzleSessionRepository = (database: DbExecutor): SessionRepository => ({
  async create(session) {
    await database.insert(sessions).values(session)
  },

  async findByTokenHash(tokenHash) {
    const [row] = await database
      .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt, supportSessionId: sessions.supportSessionId, lastSeenAt: sessions.lastSeenAt, device: sessions.device })
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

  async setDevice(id, device) {
    await database.update(sessions).set({ device }).where(and(eq(sessions.id, id), isNull(sessions.device)))
  },

  async seen(id, at) {
    await database.update(sessions).set({ lastSeenAt: at }).where(eq(sessions.id, id))
  },

  async listByUser(userId) {
    return database
      .select({ id: sessions.id, device: sessions.device, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sql`coalesce(${sessions.lastSeenAt}, ${sessions.createdAt})`))
  },

  async deleteOthers(userId, keepId) {
    await database.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, keepId)))
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
