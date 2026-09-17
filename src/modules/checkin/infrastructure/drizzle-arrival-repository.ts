import { desc, eq, sql, or } from 'drizzle-orm'
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
        recordedBy: row.recordedBy ?? null,
        personIds: row.personIds === undefined || row.personIds === null ? null : [...row.personIds],
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
        personIds: arrivals.personIds,
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
        personIds: arrivals.personIds,
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
  tokenHashPrev: Buffer | null
  passCode: string | null
  tableLabel: string | null
  leadName: string | null
  people: unknown
}): DoorGroupRow => ({
  id: r.id,
  eventId: r.eventId,
  label: r.label,
  seats: r.seats,
  attending: r.attending,
  revoked: r.revokedAt !== null,
  tokenHash: r.tokenHash,
  tokenHashPrev: r.tokenHashPrev,
  passCode: r.passCode,
  tableLabel: r.tableLabel,
  leadName: r.leadName,
  // `json_agg` llega ya parseado; sin personas, `null`.
  people: Array.isArray(r.people) ? (r.people as { id: string; fullName: string; vip?: boolean }[]) : [],
})

const groupColumns = (latest: ReturnType<typeof latestAttending>) => ({
  id: guestGroups.id,
  eventId: guestGroups.eventId,
  label: guestGroups.label,
  seats: guestGroups.seats,
  attending: latest.attending,
  revokedAt: guestGroups.revokedAt,
  tokenHash: guestGroups.tokenHash,
  tokenHashPrev: guestGroups.tokenHashPrev,
  passCode: guestGroups.passCode,
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
  /** Las personas, el principal primero: la puerta marca quién entra. Nombres cualificados a mano, por lo mismo. */
  people: sql<unknown>`(
    select json_agg(json_build_object('id', gp.id, 'fullName', gp.full_name, 'vip', gp.vip) order by gp.is_companion asc, gp.created_at asc)
      from guest_people gp
     where gp.guest_group_id = guest_groups.id
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
      // También por el anterior: una invitación puede tener dos enlaces vivos (`0064`).
      .where(or(eq(guestGroups.tokenHash, tokenHash), eq(guestGroups.tokenHashPrev, tokenHash)))
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
