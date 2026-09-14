import { and, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventStaff, users } from '@/shared/db/schema'
import type { Membership, StaffReader } from '../application/ports'

export type StaffRow = { readonly userId: string; readonly email: string }

/**
 * La clase de pertenencia va en **todas** las consultas, nunca por omisión.
 *
 * Sin ella, `isStaffOf` diría que sí para un cliente preguntando por la puerta y al revés:
 * las dos clases viven en la misma tabla, que es justo lo que hace barato tenerlas juntas
 * y lo que obliga a no olvidarse del filtro.
 */
export const createDrizzleStaffRepository = (database: DbExecutor) => ({
  async isStaffOf(eventId: string, userId: string, membership: Membership): Promise<boolean> {
    const [fila] = await database
      .select({ userId: eventStaff.userId })
      .from(eventStaff)
      .where(
        and(
          eq(eventStaff.eventId, eventId),
          eq(eventStaff.userId, userId),
          eq(eventStaff.membership, membership),
        ),
      )
      .limit(1)

    return fila !== undefined
  },

  async eventIdsOf(userId: string, membership: Membership): Promise<string[]> {
    const filas = await database
      .select({ eventId: eventStaff.eventId })
      .from(eventStaff)
      .where(and(eq(eventStaff.userId, userId), eq(eventStaff.membership, membership)))

    return filas.map((f) => f.eventId)
  },

  async add(eventId: string, userId: string, membership: Membership): Promise<void> {
    // Añadir dos veces al mismo no es un error: es pulsar dos veces. Y si ya estaba con
    // otra clase, la nueva manda: es lo que acaba de pedir quien lo da de alta.
    await database
      .insert(eventStaff)
      .values({ eventId, userId, membership })
      .onConflictDoUpdate({
        target: [eventStaff.eventId, eventStaff.userId],
        set: { membership },
      })
  },

  async remove(eventId: string, userId: string): Promise<void> {
    await database.delete(eventStaff).where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.userId, userId)))
  },

  /** Los de una clase con su correo, que es lo único que la pantalla enseña de ellos. */
  async listWithEmail(eventId: string, membership: Membership): Promise<StaffRow[]> {
    return database
      .select({ userId: eventStaff.userId, email: users.email })
      .from(eventStaff)
      .innerJoin(users, eq(users.id, eventStaff.userId))
      .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.membership, membership)))
      .orderBy(users.email)
  },

  /**
   * Todos los identificadores de la pertenencia, **sin filtrar por clase**: lo usa el
   * borrado del evento, y ahí se van los dos.
   */
  async listUserIds(eventId: string): Promise<string[]> {
    const filas = await database.select({ userId: eventStaff.userId }).from(eventStaff).where(eq(eventStaff.eventId, eventId))
    return filas.map((f) => f.userId)
  },
})

export const drizzleStaffRepository: StaffReader & ReturnType<typeof createDrizzleStaffRepository> =
  createDrizzleStaffRepository(db)
