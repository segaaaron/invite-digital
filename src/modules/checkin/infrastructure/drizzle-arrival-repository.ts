import { desc, eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { arrivals, guestGroups, rsvpResponses, venueTables } from '@/shared/db/schema'
import type { ArrivalRepository, DoorGroupReader, DoorGroupRow } from '../application/ports'

export const createDrizzleArrivalRepository = (database: DbExecutor): ArrivalRepository => ({
  async insertIfAbsent(row) {
    // `onConflictDoNothing` sobre `scan_id` convierte la idempotencia en una garantía de
    // la base, no en una comprobación de la aplicación que una carrera podría saltarse.
    const inserted = await database
      .insert(arrivals)
      .values({
        scanId: row.scanId,
        guestGroupId: row.guestGroupId,
        arrivedCount: row.arrivedCount,
        scannedAt: row.scannedAt,
        voidedAt: row.voidedAt,
      })
      .onConflictDoNothing({ target: arrivals.scanId })
      .returning({ scanId: arrivals.scanId })

    return inserted.length > 0
  },

  async listByEvent(eventId) {
    return database
      .select({
        scanId: arrivals.scanId,
        guestGroupId: arrivals.guestGroupId,
        arrivedCount: arrivals.arrivedCount,
        scannedAt: arrivals.scannedAt,
        voidedAt: arrivals.voidedAt,
      })
      .from(arrivals)
      .innerJoin(guestGroups, eq(guestGroups.id, arrivals.guestGroupId))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(desc(arrivals.scannedAt))
  },

  async findByScanId(scanId) {
    const [row] = await database
      .select({
        scanId: arrivals.scanId,
        guestGroupId: arrivals.guestGroupId,
        arrivedCount: arrivals.arrivedCount,
        scannedAt: arrivals.scannedAt,
        voidedAt: arrivals.voidedAt,
      })
      .from(arrivals)
      .where(eq(arrivals.scanId, scanId))
      .limit(1)
    return row ?? null
  },

  async adjust(scanId, arrivedCount) {
    await database.update(arrivals).set({ arrivedCount }).where(eq(arrivals.scanId, scanId))
  },

  async void(scanId, at) {
    await database.update(arrivals).set({ voidedAt: at }).where(eq(arrivals.scanId, scanId))
  },
})

const latestAttending = (database: DbExecutor) =>
  database
    .selectDistinctOn([rsvpResponses.guestGroupId], {
      guestGroupId: rsvpResponses.guestGroupId,
      attending: rsvpResponses.attending,
    })
    .from(rsvpResponses)
    .orderBy(rsvpResponses.guestGroupId, desc(rsvpResponses.respondedAt))
    .as('latest')

const toRow = (r: {
  id: string
  eventId: string
  label: string
  seats: number
  attending: number | null
  revokedAt: Date | null
  tokenHash: Buffer
  tableLabel: string | null
  leadName: string | null
}): DoorGroupRow => ({
  id: r.id,
  eventId: r.eventId,
  label: r.label,
  seats: r.seats,
  attending: r.attending,
  revoked: r.revokedAt !== null,
  tokenHash: r.tokenHash,
  tableLabel: r.tableLabel,
  leadName: r.leadName,
})

const groupColumns = (latest: ReturnType<typeof latestAttending>) => ({
  id: guestGroups.id,
  eventId: guestGroups.eventId,
  label: guestGroups.label,
  seats: guestGroups.seats,
  attending: latest.attending,
  revokedAt: guestGroups.revokedAt,
  tokenHash: guestGroups.tokenHash,
  tableLabel: venueTables.label,
  /**
   * Quien encabeza el grupo: la primera persona cargada que no es acompañante, y si
   * todas lo son, la primera a secas.
   *
   * Va en una subconsulta con los nombres **cualificados a mano**: interpolar
   * `${guestGroups.id}` dentro de un `sql` lo emite como `"id"` a secas, y ahí dentro
   * `"id"` sería `guest_people.id`. Ese fallo ya pasó una vez, en los recuentos del
   * admin, y contaba cero sin dar error.
   */
  leadName: sql<string | null>`(
    select gp.full_name
      from guest_people gp
     where gp.guest_group_id = guest_groups.id
     order by gp.is_companion asc, gp.created_at asc
     limit 1
  )`,
})

export const createDrizzleDoorGroupReader = (database: DbExecutor): DoorGroupReader => ({
  async findByTokenHash(tokenHash) {
    const latest = latestAttending(database)
    const [row] = await database
      .select(groupColumns(latest))
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      // Left join, no inner: un grupo sin mesa tiene que seguir apareciendo en la puerta.
      .leftJoin(venueTables, eq(venueTables.id, guestGroups.tableId))
      .where(eq(guestGroups.tokenHash, tokenHash))
      .limit(1)
    return row ? toRow(row) : null
  },

  async findGroupById(id) {
    const latest = latestAttending(database)
    const [row] = await database
      .select(groupColumns(latest))
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      // Left join, no inner: un grupo sin mesa tiene que seguir apareciendo en la puerta.
      .leftJoin(venueTables, eq(venueTables.id, guestGroups.tableId))
      .where(eq(guestGroups.id, id))
      .limit(1)
    return row ? toRow(row) : null
  },

  async listByEvent(eventId) {
    const latest = latestAttending(database)
    const rows = await database
      .select(groupColumns(latest))
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      // Left join, no inner: un grupo sin mesa tiene que seguir apareciendo en la puerta.
      .leftJoin(venueTables, eq(venueTables.id, guestGroups.tableId))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(guestGroups.label)
    return rows.map(toRow)
  },
})

export const drizzleArrivalRepository = createDrizzleArrivalRepository(db)
export const drizzleDoorGroupReader = createDrizzleDoorGroupReader(db)
