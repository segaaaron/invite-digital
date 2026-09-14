import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { doorPorters, events } from '@/shared/db/schema'
import type { PorterRow, PorterStore } from '../application/ports'

const columnas = {
  id: doorPorters.id,
  eventId: doorPorters.eventId,
  eventSlug: events.slug,
  eventTitle: events.title,
  eventDate: events.eventDate,
  name: doorPorters.name,
  phone: doorPorters.phone,
  gate: doorPorters.gate,
  tokenHash: doorPorters.tokenHash,
  pinHash: doorPorters.pinHash,
  failedAttempts: doorPorters.failedAttempts,
  lockedUntil: doorPorters.lockedUntil,
  opensHoursBefore: doorPorters.opensHoursBefore,
  closesHoursAfter: doorPorters.closesHoursAfter,
  revokedAt: doorPorters.revokedAt,
  createdAt: doorPorters.createdAt,
}

export const createDrizzlePorterStore = (database: DbExecutor): PorterStore => ({
  async add(porter) {
    const [fila] = await database.insert(doorPorters).values(porter).returning({ id: doorPorters.id })
    if (!fila) throw new Error('No se pudo guardar el portero')
    return fila.id
  },

  async listActive(eventId): Promise<PorterRow[]> {
    return database
      .select(columnas)
      .from(doorPorters)
      .innerJoin(events, eq(events.id, doorPorters.eventId))
      .where(and(eq(doorPorters.eventId, eventId), isNull(doorPorters.revokedAt)))
      .orderBy(asc(doorPorters.createdAt))
  },

  async countActive(eventId) {
    const [fila] = await database
      .select({ total: count() })
      .from(doorPorters)
      .where(and(eq(doorPorters.eventId, eventId), isNull(doorPorters.revokedAt)))
    return fila?.total ?? 0
  },

  async findByTokenHash(hash) {
    const [fila] = await database
      .select(columnas)
      .from(doorPorters)
      .innerJoin(events, eq(events.id, doorPorters.eventId))
      .where(eq(doorPorters.tokenHash, hash))
      .limit(1)
    return fila ?? null
  },

  /**
   * Suma en la base, no leyendo y reescribiendo: dos PIN a la vez perderían una cuenta, y
   * es justo la que importa. El bloqueo se decide en la misma sentencia con el valor nuevo.
   */
  async registerFailure(id, lockUntilIfReached, maxAttempts) {
    await database
      .update(doorPorters)
      .set({
        failedAttempts: sql`${doorPorters.failedAttempts} + 1`,
        lockedUntil: sql`case when ${doorPorters.failedAttempts} + 1 >= ${maxAttempts} then ${lockUntilIfReached.toISOString()}::timestamptz else ${doorPorters.lockedUntil} end`,
      })
      .where(eq(doorPorters.id, id))
  },

  async resetFailures(id) {
    await database.update(doorPorters).set({ failedAttempts: 0, lockedUntil: null }).where(eq(doorPorters.id, id))
  },

  async revoke(id, eventId, at) {
    const filas = await database
      .update(doorPorters)
      .set({ revokedAt: at })
      .where(and(eq(doorPorters.id, id), eq(doorPorters.eventId, eventId), isNull(doorPorters.revokedAt)))
      .returning({ id: doorPorters.id })
    return filas.length > 0
  },
})

export const drizzlePorterStore = createDrizzlePorterStore(db)
