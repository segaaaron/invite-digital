import { sql } from 'drizzle-orm'
import { boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { events } from './eventos'
import { bytea } from './base'

/**
 * El plan de tareas de un evento. Se siembra con la plantilla de su fiesta al crearlo; las
 * propias se suman a mano. Quién la cerró es texto, como en la auditoría.
 */
export const plannerTasks = pgTable(
  'planner_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    stage: varchar('stage', { length: 24 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    dueDate: date('due_date'),
    assignee: varchar('assignee', { length: 16 }).notNull().default('anfitrion'),
    notes: text('notes'),
    doneAt: timestamp('done_at', { withTimezone: true }),
    doneBy: varchar('done_by', { length: 255 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('planner_tasks_event_idx').on(t.eventId, t.sortOrder),
    check('planner_tasks_assignee_check', sql`${t.assignee} in ('anfitrion', 'planner', 'familia')`),
  ],
)

/** Una partida del presupuesto. Centavos enteros; `contracted_cents` nulo es «sin contrato». */
/**
 * El presupuesto total del evento y cómo se reparte por categorías (`0060`). Una fila por
 * evento. `allocations` son centavos por clave de categoría; su suma es `total_cents`.
 */
export const budgetPlans = pgTable('budget_plans', {
  eventId: uuid('event_id')
    .primaryKey()
    .references(() => events.id, { onDelete: 'cascade' }),
  totalCents: integer('total_cents').notNull(),
  allocations: jsonb('allocations').$type<Record<string, number>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [check('budget_plans_total_check', sql`${t.totalCents} >= 0`)])

export const budgetItems = pgTable(
  'budget_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 32 }).notNull(),
    concept: varchar('concept', { length: 160 }).notNull(),
    estimatedCents: integer('estimated_cents').notNull().default(0),
    contractedCents: integer('contracted_cents'),
    payer: varchar('payer', { length: 16 }).notNull().default('anfitriones'),
    padrinoLabel: varchar('padrino_label', { length: 120 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('budget_items_event_idx').on(t.eventId),
    check('budget_items_amounts_check', sql`${t.estimatedCents} >= 0 and (${t.contractedCents} is null or ${t.contractedCents} >= 0)`),
    check('budget_items_payer_check', sql`${t.payer} in ('anfitriones', 'familia_a', 'familia_b', 'padrino', 'otro')`),
  ],
)

/** Un pago de una partida: anticipo, cuota o saldo, con su fecha y si ya se pagó. */
export const budgetPayments = pgTable(
  'budget_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => budgetItems.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    /** `anticipo` · `cuota` · `saldo`, o nada. */
    label: varchar('label', { length: 16 }),
    dueDate: date('due_date'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('budget_payments_item_idx').on(t.itemId), check('budget_payments_amount_check', sql`${t.amountCents} > 0`)],
)

/** Un proveedor del evento. Su dinero vive en su partida del presupuesto; el enlace, como hash. */
export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    service: varchar('service', { length: 80 }).notNull(),
    company: varchar('company', { length: 120 }),
    contactName: varchar('contact_name', { length: 120 }),
    whatsapp: varchar('whatsapp', { length: 20 }),
    email: varchar('email', { length: 200 }),
    status: varchar('status', { length: 16 }).notNull().default('cotizando'),
    arrivalTime: varchar('arrival_time', { length: 5 }),
    setupNotes: text('setup_notes'),
    budgetItemId: uuid('budget_item_id').references(() => budgetItems.id, { onDelete: 'set null' }),
    accessTokenHash: bytea('access_token_hash').unique(),
    /** Cuándo llegó el día del evento. Lo marca el Día D. */
    arrivedAt: timestamp('arrived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('vendors_event_idx').on(t.eventId),
    check('vendors_status_check', sql`${t.status} in ('cotizando', 'reservado', 'contratado', 'confirmado')`),
  ],
)

/** El cronograma interno del día, momento a momento. Las horas son `HH:MM` de Bolivia. */
export const runOfShow = pgTable(
  'run_of_show',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    startsAt: varchar('starts_at', { length: 5 }).notNull(),
    durationMin: integer('duration_min').notNull().default(15),
    title: varchar('title', { length: 160 }).notNull(),
    place: varchar('place', { length: 120 }),
    owner: varchar('owner', { length: 120 }),
    vendorIds: uuid('vendor_ids').array().notNull().default(sql`'{}'`),
    cue: varchar('cue', { length: 200 }),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Sale en el itinerario de la invitación (`0059`): el cronograma es la única lista. */
    inInvitation: boolean('in_invitation').notNull().default(false),
    icon: varchar('icon', { length: 40 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('run_of_show_event_idx').on(t.eventId), check('run_of_show_duration_check', sql`${t.durationMin} between 1 and 600`)],
)

/** El cortejo: padrinos, damas y caballeros, chambelanes y corte de honor. */
export const courtMembers = pgTable(
  'court_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 16 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    whatsapp: varchar('whatsapp', { length: 20 }),
    sponsors: varchar('sponsors', { length: 200 }),
    size: varchar('size', { length: 20 }),
    confirmed: boolean('confirmed').notNull().default(false),
    budgetItemId: uuid('budget_item_id').references(() => budgetItems.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('court_members_event_idx').on(t.eventId),
    check('court_members_kind_check', sql`${t.kind} in ('padrino', 'dama', 'caballero', 'chambelan', 'corte')`),
  ],
)

export const rehearsals = pgTable(
  'rehearsals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    date: timestamp('date', { withTimezone: true }).notNull(),
    place: varchar('place', { length: 120 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('rehearsals_event_idx').on(t.eventId)],
)

export const rehearsalAttendees = pgTable(
  'rehearsal_attendees',
  {
    rehearsalId: uuid('rehearsal_id')
      .notNull()
      .references(() => rehearsals.id, { onDelete: 'cascade' }),
    courtMemberId: uuid('court_member_id')
      .notNull()
      .references(() => courtMembers.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.rehearsalId, t.courtMemberId] })],
)

/**
 * Documentos privados del evento: contratos, cotizaciones, facturas y fotos de referencia.
 * Tabla propia y no `event_media`, que `/media/[id]` sirve a quien tenga la invitación.
 */
export const eventDocuments = pgTable(
  'event_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 16 }).notNull(),
    topic: varchar('topic', { length: 80 }),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 32 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
    budgetItemId: uuid('budget_item_id').references(() => budgetItems.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('event_documents_event_idx').on(t.eventId),
    check('event_documents_kind_check', sql`${t.kind} in ('contrato', 'cotizacion', 'factura', 'referencia')`),
  ],
)
