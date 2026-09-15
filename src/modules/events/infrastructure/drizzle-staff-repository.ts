import { and, count, eq, inArray } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventStaff, users } from '@/shared/db/schema'
import type { Membership, StaffReader } from '../application/ports'

export type StaffRow = { readonly userId: string; readonly email: string }

/**
 * La clase de pertenencia viaja siempre: `membershipsOf` la devuelve y quien decide qué abre
 * es `canAccessEvent`, y `eventIdsOf` la exige. Sin ella, un cliente entraría por la
 * pertenencia de la puerta y al revés: las clases viven en la misma tabla.
 */
export const createDrizzleStaffRepository = (database: DbExecutor) => ({
  async membershipsOf(eventId: string, userId: string): Promise<Membership[]> {
    const filas = await database
      .select({ membership: eventStaff.membership })
      .from(eventStaff)
      .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.userId, userId)))
    return filas.map((f) => f.membership as Membership)
  },

  async eventIdsOf(userId: string, memberships: readonly Membership[]): Promise<string[]> {
    if (memberships.length === 0) return []
    const filas = await database
      .select({ eventId: eventStaff.eventId })
      .from(eventStaff)
      .where(and(eq(eventStaff.userId, userId), inArray(eventStaff.membership, [...memberships])))

    return filas.map((f) => f.eventId)
  },

  /** El equipo de quien celebra, con su correo: anfitrión, co-anfitriones y planner. */
  async listTeam(eventId: string): Promise<Array<StaffRow & { membership: Membership }>> {
    const filas = await database
      .select({ userId: eventStaff.userId, email: users.email, membership: eventStaff.membership })
      .from(eventStaff)
      .innerJoin(users, eq(users.id, eventStaff.userId))
      .where(and(eq(eventStaff.eventId, eventId), inArray(eventStaff.membership, ['cliente', 'coanfitrion', 'planner'])))
      .orderBy(users.email)
    return filas.map((f) => ({ ...f, membership: f.membership as Membership }))
  },

  async countOf(eventId: string, membership: Membership): Promise<number> {
    const [fila] = await database
      .select({ total: count() })
      .from(eventStaff)
      .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.membership, membership)))
    return fila?.total ?? 0
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
  /** Los anfitriones de varias bodas en **una** consulta: la cartera los pinta fila a fila. */
  async hostsOf(eventIds: readonly string[]): Promise<Map<string, StaffRow[]>> {
    const porEvento = new Map<string, StaffRow[]>()
    if (eventIds.length === 0) return porEvento
    const filas = await database
      .select({ eventId: eventStaff.eventId, userId: eventStaff.userId, email: users.email })
      .from(eventStaff)
      .innerJoin(users, eq(users.id, eventStaff.userId))
      .where(and(inArray(eventStaff.eventId, [...eventIds]), eq(eventStaff.membership, 'cliente')))
      .orderBy(users.email)
    for (const { eventId, ...fila } of filas) porEvento.set(eventId, [...(porEvento.get(eventId) ?? []), fila])
    return porEvento
  },

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
