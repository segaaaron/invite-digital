import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { clientShares } from '@/shared/db/schema'
import type { ClientShareRepository } from '../application/ports'

const COLUMNS = {
  id: clientShares.id,
  eventId: clientShares.eventId,
  expiresAt: clientShares.expiresAt,
  revokedAt: clientShares.revokedAt,
} as const

export const createDrizzleClientShareRepository = (database: DbExecutor): ClientShareRepository => ({
  async insert(share) {
    await database.insert(clientShares).values(share)
  },

  async findByTokenHash(tokenHash) {
    const [row] = await database.select(COLUMNS).from(clientShares).where(eq(clientShares.tokenHash, tokenHash)).limit(1)
    return row ?? null
  },

  async findLiveByEvent(eventId, now) {
    // El más reciente de los que siguen sirviendo: el panel enseña uno solo, y crear
    // otro no invalida el anterior hasta que se revoque a mano.
    const [row] = await database
      .select(COLUMNS)
      .from(clientShares)
      .where(and(eq(clientShares.eventId, eventId), isNull(clientShares.revokedAt), gt(clientShares.expiresAt, now)))
      .orderBy(desc(clientShares.createdAt))
      .limit(1)
    return row ?? null
  },

  async revoke(id, at) {
    await database.update(clientShares).set({ revokedAt: at }).where(eq(clientShares.id, id))
  },
})

export const drizzleClientShareRepository = createDrizzleClientShareRepository(db)
