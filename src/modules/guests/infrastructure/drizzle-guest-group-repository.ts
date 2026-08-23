import { and, asc, eq, isNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups } from '@/shared/db/schema'
import type { GuestGroupRepository } from '../application/ports'

const COLUMNS = {
  id: guestGroups.id,
  eventId: guestGroups.eventId,
  label: guestGroups.label,
  seats: guestGroups.seats,
  revokedAt: guestGroups.revokedAt,
  openedAt: guestGroups.openedAt,
  invitationSentAt: guestGroups.invitationSentAt,
} as const

export const createDrizzleGuestGroupRepository = (database: DbExecutor): GuestGroupRepository => ({
  async insert(group, tokenHash) {
    await database.insert(guestGroups).values({
      id: group.id,
      eventId: group.eventId,
      label: group.label,
      seats: group.seats,
      tokenHash,
    })
  },

  async listByEvent(eventId) {
    return database.select(COLUMNS).from(guestGroups).where(eq(guestGroups.eventId, eventId)).orderBy(asc(guestGroups.createdAt))
  },

  async findById(id) {
    const [row] = await database.select(COLUMNS).from(guestGroups).where(eq(guestGroups.id, id)).limit(1)
    return row ?? null
  },

  async findByTokenHash(tokenHash) {
    const [row] = await database.select(COLUMNS).from(guestGroups).where(eq(guestGroups.tokenHash, tokenHash)).limit(1)
    return row ?? null
  },

  async markSent(id, at) {
    await database.update(guestGroups).set({ invitationSentAt: at }).where(eq(guestGroups.id, id))
  },

  async revoke(id, at) {
    await database.update(guestGroups).set({ revokedAt: at }).where(eq(guestGroups.id, id))
  },

  async markOpened(id, at) {
    // `isNull` en el where: una segunda apertura no debe reescribir la marca, y así la
    // condición vive en la base y no en una lectura previa que otra petición podría
    // adelantar.
    await database
      .update(guestGroups)
      .set({ openedAt: at })
      .where(and(eq(guestGroups.id, id), isNull(guestGroups.openedAt)))
  },
})

export const drizzleGuestGroupRepository = createDrizzleGuestGroupRepository(db)
