import { and, asc, count, eq, isNull } from 'drizzle-orm'
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
  phone: guestGroups.phone,
  createdAt: guestGroups.createdAt,
} as const

/** La fila por su id **y** su evento: el id llega del navegador, el evento de la guardia. */
const delEvento = (eventId: string, id: string) => and(eq(guestGroups.id, id), eq(guestGroups.eventId, eventId))

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

  async findById(eventId, id) {
    const [row] = await database.select(COLUMNS).from(guestGroups).where(delEvento(eventId, id)).limit(1)
    return row ?? null
  },

  async findByTokenHash(tokenHash) {
    const [row] = await database.select(COLUMNS).from(guestGroups).where(eq(guestGroups.tokenHash, tokenHash)).limit(1)
    return row ?? null
  },

  async replaceToken(eventId, id, tokenHash) {
    // Reenviar rota el token: el enlace viejo deja de abrir nada. No se puede «volver a
    // enseñar» el anterior porque en la base solo estaba su hash.
    await database.update(guestGroups).set({ tokenHash }).where(delEvento(eventId, id))
  },

  async reopenRsvp(eventId, id, when) {
    await database.update(guestGroups).set({ rsvpReopenedAt: when }).where(delEvento(eventId, id))
  },

  async setPhone(eventId, id, phone) {
    await database.update(guestGroups).set({ phone }).where(delEvento(eventId, id))
  },

  async markSent(eventId, id, at) {
    await database.update(guestGroups).set({ invitationSentAt: at }).where(delEvento(eventId, id))
  },

  async setSeats(eventId, id, seats) {
    await database.update(guestGroups).set({ seats }).where(delEvento(eventId, id))
  },

  async setLabel(eventId, id, label) {
    await database.update(guestGroups).set({ label }).where(delEvento(eventId, id))
  },

  async remove(eventId, id) {
    await database.delete(guestGroups).where(delEvento(eventId, id))
  },

  async revoke(eventId, id, at) {
    await database.update(guestGroups).set({ revokedAt: at }).where(delEvento(eventId, id))
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

/** Cuántos grupos tiene el evento, sin traerlos: la insignia de la barra se pinta en cada página. */
export const countGroupsByEvent = async (database: DbExecutor, eventId: string): Promise<number> => {
  const [fila] = await database.select({ total: count() }).from(guestGroups).where(eq(guestGroups.eventId, eventId))
  return fila?.total ?? 0
}
