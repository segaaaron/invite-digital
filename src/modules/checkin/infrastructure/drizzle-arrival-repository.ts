import { desc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { arrivals, guestGroups, rsvpResponses } from '@/shared/db/schema'
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
}): DoorGroupRow => ({
  id: r.id,
  eventId: r.eventId,
  label: r.label,
  seats: r.seats,
  attending: r.attending,
  revoked: r.revokedAt !== null,
  tokenHash: r.tokenHash,
})

const groupColumns = (latest: ReturnType<typeof latestAttending>) => ({
  id: guestGroups.id,
  eventId: guestGroups.eventId,
  label: guestGroups.label,
  seats: guestGroups.seats,
  attending: latest.attending,
  revokedAt: guestGroups.revokedAt,
  tokenHash: guestGroups.tokenHash,
})

export const createDrizzleDoorGroupReader = (database: DbExecutor): DoorGroupReader => ({
  async findByTokenHash(tokenHash) {
    const latest = latestAttending(database)
    const [row] = await database
      .select(groupColumns(latest))
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
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
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(guestGroups.label)
    return rows.map(toRow)
  },
})

export const drizzleArrivalRepository = createDrizzleArrivalRepository(db)
export const drizzleDoorGroupReader = createDrizzleDoorGroupReader(db)
