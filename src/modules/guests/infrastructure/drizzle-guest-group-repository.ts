import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups } from '@/shared/db/schema'
import { env } from '@/shared/config/env'
import { crearSello } from '@/shared/security/sello'
import type { GuestGroupRepository } from '../application/ports'
import { codigoDePase } from '../domain/codigo-de-pase'

const sello = crearSello(env.LINK_KEY ?? env.DATABASE_URL)

const COLUMNS = {
  id: guestGroups.id,
  eventId: guestGroups.eventId,
  label: guestGroups.label,
  seats: guestGroups.seats,
  revokedAt: guestGroups.revokedAt,
  openedAt: guestGroups.openedAt,
  invitationSentAt: guestGroups.invitationSentAt,
  phone: guestGroups.phone,
  passCode: guestGroups.passCode,
  createdAt: guestGroups.createdAt,
} as const

/** La fila por su id **y** su evento: el id llega del navegador, el evento de la guardia. */
const delEvento = (eventId: string, id: string) => and(eq(guestGroups.id, id), eq(guestGroups.eventId, eventId))

export const createDrizzleGuestGroupRepository = (database: DbExecutor): GuestGroupRepository => ({
  async insert(group, tokenHash, token) {
    // El código corto puede chocar con otro del mismo evento (uno entre millones): se prueba otro.
    // `on conflict do nothing` y no capturar el error: dentro de una transacción, el error la aborta.
    for (let intento = 0; intento < 8; intento++) {
      const insertadas = await database
        .insert(guestGroups)
        .values({ id: group.id, eventId: group.eventId, label: group.label, seats: group.seats, tokenHash, tokenSealed: sello.sellar(token), passCode: codigoDePase() })
        .onConflictDoNothing()
        .returning({ id: guestGroups.id })
      if (insertadas.length > 0) return
    }
    throw new Error('No se pudo dar un código de pase único a la invitación')
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

  async replaceToken(eventId, id, tokenHash, token) {
    // Reenviar rota el token: el enlace viejo deja de abrir nada.
    await database.update(guestGroups).set({ tokenHash, tokenSealed: sello.sellar(token) }).where(delEvento(eventId, id))
  },

  async tokensOf(eventId) {
    const filas = await database.select({ id: guestGroups.id, sellado: guestGroups.tokenSealed }).from(guestGroups).where(eq(guestGroups.eventId, eventId))
    const tokens = new Map<string, string>()
    for (const fila of filas) {
      const token = fila.sellado === null ? null : sello.abrir(fila.sellado)
      if (token !== null) tokens.set(fila.id, token)
    }
    return tokens
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
