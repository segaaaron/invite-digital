import { desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups, guestPeople, rsvpResponses, venueTables, venueZones } from '@/shared/db/schema'
import { TABLE_SHAPES, type TableShape, type VenueTable } from '../domain/venue-table'
import { ZONE_KINDS, type VenueZone, type ZoneKind } from '../domain/venue-zone'
import type { SeatedGroupRow, VenueRepository } from '../application/ports'

/**
 * `numeric` de Postgres llega como cadena por el driver: si no se convierte aquí, el
 * plano recibe "12.50" y `left: 12.50%` funciona por casualidad hasta que alguien hace
 * aritmética con ello y obtiene "12.505".
 */
const toNumber = (value: string): number => Number(value)
const toNumeric = (value: number): string => value.toFixed(2)

/**
 * La forma y la clase viven en la base como `varchar`. Al leer se comprueban contra la
 * lista que el plano sabe dibujar: una fila escrita a mano con una forma inventada cae
 * al valor por defecto en vez de romper el render.
 */
const toShape = (value: string): TableShape =>
  (TABLE_SHAPES as readonly string[]).includes(value) ? (value as TableShape) : 'round'

const toZoneKind = (value: string): ZoneKind =>
  (ZONE_KINDS as readonly string[]).includes(value) ? (value as ZoneKind) : 'dance'

const tableColumns = {
  id: venueTables.id,
  eventId: venueTables.eventId,
  label: venueTables.label,
  capacity: venueTables.capacity,
  shape: venueTables.shape,
  notes: venueTables.notes,
  x: venueTables.x,
  y: venueTables.y,
}

type TableRow = {
  id: string
  eventId: string
  label: string
  capacity: number
  shape: string
  notes: string | null
  x: string
  y: string
}

const toTable = (r: TableRow): VenueTable => ({
  id: r.id,
  eventId: r.eventId,
  label: r.label,
  capacity: r.capacity,
  shape: toShape(r.shape),
  notes: r.notes,
  x: toNumber(r.x),
  y: toNumber(r.y),
})

type ZoneRow = { id: string; eventId: string; kind: string; label: string; x: string; y: string; w: string; h: string }

const toZone = (r: ZoneRow): VenueZone => ({
  id: r.id,
  eventId: r.eventId,
  kind: toZoneKind(r.kind),
  label: r.label,
  x: toNumber(r.x),
  y: toNumber(r.y),
  w: toNumber(r.w),
  h: toNumber(r.h),
})

/** La última respuesta de cada grupo: un grupo puede cambiar de idea, y manda la última. */
const latestAttending = (database: DbExecutor) =>
  database
    .selectDistinctOn([rsvpResponses.guestGroupId], {
      guestGroupId: rsvpResponses.guestGroupId,
      attending: rsvpResponses.attending,
    })
    .from(rsvpResponses)
    .orderBy(rsvpResponses.guestGroupId, desc(rsvpResponses.respondedAt))
    .as('latest')

export const createDrizzleVenueRepository = (database: DbExecutor): VenueRepository => ({
  async listTables(eventId) {
    const rows = await database
      .select(tableColumns)
      .from(venueTables)
      .where(eq(venueTables.eventId, eventId))
      .orderBy(venueTables.label)
    return rows.map(toTable)
  },

  async findTable(id) {
    const [row] = await database.select(tableColumns).from(venueTables).where(eq(venueTables.id, id)).limit(1)
    return row ? toTable(row) : null
  },

  async insertTable(table) {
    await database.insert(venueTables).values({
      id: table.id,
      eventId: table.eventId,
      label: table.label,
      capacity: table.capacity,
      shape: table.shape,
      notes: table.notes,
      x: toNumeric(table.x),
      y: toNumeric(table.y),
    })
  },

  async updateTable(table) {
    await database
      .update(venueTables)
      .set({
        label: table.label,
        capacity: table.capacity,
        shape: table.shape,
        notes: table.notes,
        x: toNumeric(table.x),
        y: toNumeric(table.y),
      })
      .where(eq(venueTables.id, table.id))
  },

  async deleteTable(id) {
    // El `ON DELETE SET NULL` de `guest_groups.table_id` deja a los grupos sin mesa. No
    // hay que limpiarlos aquí: hacerlo a mano sería una segunda verdad que puede
    // desincronizarse de la restricción.
    await database.delete(venueTables).where(eq(venueTables.id, id))
  },

  async listZones(eventId) {
    const rows = await database.select().from(venueZones).where(eq(venueZones.eventId, eventId))
    return rows.map(toZone)
  },

  async findZone(id) {
    const [row] = await database.select().from(venueZones).where(eq(venueZones.id, id)).limit(1)
    return row ? toZone(row) : null
  },

  async insertZone(zone) {
    await database.insert(venueZones).values({
      id: zone.id,
      eventId: zone.eventId,
      kind: zone.kind,
      label: zone.label,
      x: toNumeric(zone.x),
      y: toNumeric(zone.y),
      w: toNumeric(zone.w),
      h: toNumeric(zone.h),
    })
  },

  async updateZone(zone) {
    await database
      .update(venueZones)
      .set({
        kind: zone.kind,
        label: zone.label,
        x: toNumeric(zone.x),
        y: toNumeric(zone.y),
        w: toNumeric(zone.w),
        h: toNumeric(zone.h),
      })
      .where(eq(venueZones.id, zone.id))
  },

  async deleteZone(id) {
    await database.delete(venueZones).where(eq(venueZones.id, id))
  },

  async listSeatedGroups(eventId): Promise<SeatedGroupRow[]> {
    const latest = latestAttending(database)
    const rows = await database
      .select({
        id: guestGroups.id,
        eventId: guestGroups.eventId,
        label: guestGroups.label,
        seats: guestGroups.seats,
        tableId: guestGroups.tableId,
        revokedAt: guestGroups.revokedAt,
        attending: latest.attending,
        // Dos preguntas del salón que la maqueta contesta con un color y un icono:
        // ¿va alguien VIP en este grupo?, ¿alguien come distinto? Se resuelven aquí, en
        // un agregado, y no con una consulta por grupo desde la página.
        vip: sql<boolean>`coalesce(bool_or(${guestPeople.vip}), false)`,
        dietary: sql<boolean>`coalesce(bool_or(${isNotNull(guestPeople.dietaryNote)}), false)`,
      })
      .from(guestGroups)
      .leftJoin(guestPeople, eq(guestPeople.guestGroupId, guestGroups.id))
      // Left join, no inner: un grupo que aún no ha respondido tiene que salir igual.
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      .where(eq(guestGroups.eventId, eventId))
      .groupBy(
        guestGroups.id,
        guestGroups.eventId,
        guestGroups.label,
        guestGroups.seats,
        guestGroups.tableId,
        guestGroups.revokedAt,
        latest.attending,
      )
      .orderBy(guestGroups.label)

    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      label: r.label,
      seats: r.seats,
      tableId: r.tableId,
      revoked: r.revokedAt !== null,
      confirmed: r.attending,
      vip: r.vip,
      dietary: r.dietary,
    }))
  },

  async setGroupTable(groupId, tableId) {
    await database.update(guestGroups).set({ tableId }).where(eq(guestGroups.id, groupId))
  },
})

export const drizzleVenueRepository = createDrizzleVenueRepository(db)
