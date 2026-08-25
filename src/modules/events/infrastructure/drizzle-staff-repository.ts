import { and, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventStaff, users } from '@/shared/db/schema'
import type { StaffReader } from '../application/ports'

export type StaffRow = { readonly userId: string; readonly email: string }

export const createDrizzleStaffRepository = (database: DbExecutor) => ({
  async isStaffOf(eventId: string, userId: string): Promise<boolean> {
    const [fila] = await database
      .select({ userId: eventStaff.userId })
      .from(eventStaff)
      .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.userId, userId)))
      .limit(1)

    return fila !== undefined
  },

  async eventIdsOf(userId: string): Promise<string[]> {
    const filas = await database
      .select({ eventId: eventStaff.eventId })
      .from(eventStaff)
      .where(eq(eventStaff.userId, userId))

    return filas.map((f) => f.eventId)
  },

  async add(eventId: string, userId: string): Promise<void> {
    // Añadir dos veces al mismo no es un error: es pulsar dos veces.
    await database.insert(eventStaff).values({ eventId, userId }).onConflictDoNothing()
  },

  async remove(eventId: string, userId: string): Promise<void> {
    await database.delete(eventStaff).where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.userId, userId)))
  },

  /** El personal con su correo, que es lo único que la pantalla enseña de ellos. */
  async listWithEmail(eventId: string): Promise<StaffRow[]> {
    return database
      .select({ userId: eventStaff.userId, email: users.email })
      .from(eventStaff)
      .innerJoin(users, eq(users.id, eventStaff.userId))
      .where(eq(eventStaff.eventId, eventId))
      .orderBy(users.email)
  },

  async listUserIds(eventId: string): Promise<string[]> {
    const filas = await database.select({ userId: eventStaff.userId }).from(eventStaff).where(eq(eventStaff.eventId, eventId))
    return filas.map((f) => f.userId)
  },
})

export const drizzleStaffRepository: StaffReader & ReturnType<typeof createDrizzleStaffRepository> =
  createDrizzleStaffRepository(db)
