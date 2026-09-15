import { sql } from 'drizzle-orm'
import { check, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { events } from './eventos'
import { guestGroups } from './invitados'

/**
 * Una mesa del salón. La posición es porcentaje del plano con dos decimales, no píxeles:
 * el plano se dibuja en un portátil y en una tablet, y los píxeles de uno no significan
 * nada en el otro.
 */
export const venueTables = pgTable(
  'venue_tables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 80 }).notNull(),
    capacity: integer('capacity').notNull(),
    // 'round' | 'rect' | 'sweetheart' | 'imperial'
    shape: varchar('shape', { length: 16 }).notNull().default('round'),
    // Lo que la recepción tiene que saber de esa mesa: «cerca del baño», «acceso silla
    // de ruedas». Va al plan del banquete impreso; no es un dato de nadie en concreto.
    notes: varchar('notes', { length: 200 }),
    x: numeric('x', { precision: 5, scale: 2 }).notNull().default('50'),
    y: numeric('y', { precision: 5, scale: 2 }).notNull().default('50'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('venue_tables_event_idx').on(t.eventId),
    // Única por evento, no en toda la base: dos «Mesa 03» en el mismo salón son un error
    // de captura, y la puerta canta ese número en voz alta.
    uniqueIndex('venue_tables_label_unique').on(t.eventId, t.label),
    check('venue_tables_capacity_positive', sql`${t.capacity} >= 1`),
  ],
)

/** Pista, barra, tarima, música y entrada: lo que no es mesa pero ocupa sitio en el plano. */
export const venueZones = pgTable(
  'venue_zones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    // 'dance' | 'bar' | 'stage' | 'music' | 'entrance' | 'kitchen' | 'photo' | 'custom'
    kind: varchar('kind', { length: 16 }).notNull(),
    label: varchar('label', { length: 80 }).notNull(),
    x: numeric('x', { precision: 5, scale: 2 }).notNull(),
    y: numeric('y', { precision: 5, scale: 2 }).notNull(),
    w: numeric('w', { precision: 5, scale: 2 }).notNull(),
    h: numeric('h', { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [index('venue_zones_event_idx').on(t.eventId)],
)

/**
 * Un regalo de la mesa. `price_cents` es un entero: el dinero nunca vive en coma
 * flotante, porque un descuadre de céntimos no tiene arreglo una vez escrito.
 *
 * `claimed_by_group_id` va con `ON DELETE SET NULL`, no `CASCADE`: borrar un grupo de
 * invitados no puede hacer desaparecer el regalo de la lista de la pareja.
 */
export const gifts = pgTable(
  'gifts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    priceCents: integer('price_cents').notNull(),
    store: varchar('store', { length: 120 }),
    url: text('url'),
    // 'available' | 'reserved' | 'purchased'
    status: varchar('status', { length: 16 }).notNull().default('available'),
    claimedByGroupId: uuid('claimed_by_group_id').references(() => guestGroups.id, { onDelete: 'set null' }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('gifts_event_idx').on(t.eventId),
    check('gifts_price_positive', sql`${t.priceCents} > 0`),
  ],
)

/** Un fondo en efectivo con su meta. No hay pasarela: lo recaudado lo registra el atelier. */
export const giftFunds = pgTable(
  'gift_funds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    goalCents: integer('goal_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('gift_funds_event_idx').on(t.eventId),
    check('gift_funds_goal_positive', sql`${t.goalCents} > 0`),
  ],
)

/**
 * Lo que alguien entregó a un fondo. `guest_group_id` es anulable a propósito: la abuela
 * que trae un sobre el día del evento no tiene grupo con enlace, y su aportación cuenta
 * igual. Por eso `display_name` sí es obligatorio.
 */
export const fundContributions = pgTable(
  'fund_contributions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fundId: uuid('fund_id')
      .notNull()
      .references(() => giftFunds.id, { onDelete: 'cascade' }),
    guestGroupId: uuid('guest_group_id').references(() => guestGroups.id, { onDelete: 'set null' }),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    // 'transfer' | 'card' | 'envelope' | 'other'
    method: varchar('method', { length: 16 }).notNull(),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('fund_contributions_fund_idx').on(t.fundId),
    check('fund_contributions_amount_positive', sql`${t.amountCents} > 0`),
  ],
)
