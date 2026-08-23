import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

export const eventCategories = pgTable('event_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const eventCategoryTranslations = pgTable(
  'event_category_translations',
  {
    categoryId: uuid('category_id')
      .notNull()
      .references(() => eventCategories.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
)

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  priceCents: integer('price_cents').notNull(),
  currency: char('currency', { length: 3 }).notNull().default('BOB'),
  highlighted: boolean('highlighted').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  /**
   * Cuántos grupos de invitados admite el plan. `NULL` es *sin límite*, no cero: el plan
   * más caro no limita nada, y un `NOT NULL DEFAULT 0` lo dejaría sin admitir ni un
   * grupo. Los límites viven en la base y no en el código porque cambiar lo que incluye
   * un plan es una decisión comercial y no debería exigir un despliegue.
   */
  maxGuestGroups: integer('max_guest_groups'),
  includesSeating: boolean('includes_seating').notNull().default(true),
  includesRegistry: boolean('includes_registry').notNull().default(true),
  includesCheckin: boolean('includes_checkin').notNull().default(true),
  ...timestamps,
})

export const planTranslations = pgTable(
  'plan_translations',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    tagline: varchar('tagline', { length: 200 }).notNull(),
    description: text('description').notNull(),
    features: jsonb('features').$type<string[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.locale] })],
)

export const templates = pgTable(
  'templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => eventCategories.id),
    coverImagePath: varchar('cover_image_path', { length: 255 }).notNull(),
    palette: jsonb('palette').$type<{ base: string; accent: string }>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('templates_published_order_idx').on(t.isPublished, t.sortOrder)],
)

export const templateTranslations = pgTable(
  'template_translations',
  {
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull(),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.locale] })],
)

export const consultationRequests = pgTable(
  'consultation_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 200 }),
    phone: varchar('phone', { length: 32 }),
    categoryId: uuid('category_id').references(() => eventCategories.id),
    eventDate: date('event_date'),
    message: text('message'),
    locale: varchar('locale', { length: 5 }).notNull(),
    utm: jsonb('utm').$type<Record<string, string>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('consultation_requests_created_idx').on(t.createdAt)],
)

export const plansRelations = relations(plans, ({ many }) => ({ translations: many(planTranslations) }))
export const templatesRelations = relations(templates, ({ many, one }) => ({
  translations: many(templateTranslations),
  category: one(eventCategories, { fields: [templates.categoryId], references: [eventCategories.id] }),
}))

// Postgres tiene `bytea` y `citext`, pero drizzle-orm/pg-core no los expone: se
// declaran a mano para que el esquema tipado no mienta. `citext` además necesita la
// extensión, que la migración crea antes de las tablas.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })
const citext = customType<{ data: string }>({ dataType: () => 'citext' })

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // La cookie lleva un token opaco; aquí solo vive su SHA-256.
    tokenHash: bytea('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sessions_expires_idx').on(t.expiresAt)],
)

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  title: varchar('title', { length: 160 }).notNull(),
  eventDate: date('event_date').notNull(),
  rsvpDeadline: date('rsvp_deadline').notNull(),
  locale: varchar('locale', { length: 5 }).notNull(),
  // Pieza compuesta a mano que se renderiza; la resuelve el registro de plantillas.
  themeKey: varchar('theme_key', { length: 64 }).notNull(),
  // draft: sin enlaces activos · live: los invitados pueden responder
  // closed: enlaces válidos, respuestas cerradas
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  retentionDays: integer('retention_days').notNull().default(90),
  // La moneda de la mesa de regalos de este evento. Por defecto BOB, que es lo que había
  // clavado en el código hasta que la maqueta pidió elegirla.
  currency: varchar('currency', { length: 3 }).notNull().default('BOB'),
  anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  /**
   * Anulable a propósito: los eventos creados antes de esta rebanada no tienen plan, y
   * quien los lea los trata como el plan más barato activo. `SET NULL` al borrar el
   * plan, nunca `CASCADE`: retirar un plan del catálogo no puede llevarse por delante
   * las bodas que lo contrataron.
   */
  planId: uuid('plan_id').references(() => plans.id, { onDelete: 'set null' }),
  ...timestamps,
})

/**
 * Una petición de cambio de plan que el atelier resuelve fuera del sistema. No hay cobro
 * en línea en esta rebanada: la solicitud queda registrada y se aplica a mano.
 */
export const planChangeRequests = pgTable(
  'plan_change_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    requestedPlanId: uuid('requested_plan_id')
      .notNull()
      .references(() => plans.id),
    note: text('note'),
    // 'pending' | 'applied' | 'rejected'
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    // Parcial y único: una sola solicitud **pendiente** por evento. Sin él, pulsar dos
    // veces genera dos solicitudes y el atelier no sabe a cuál hacer caso. Las ya
    // resueltas no estorban: quedan fuera del índice.
    uniqueIndex('plan_change_pending_idx')
      .on(t.eventId)
      .where(sql`${t.status} = 'pending'`),
  ],
)

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
    // 'dance' | 'bar' | 'stage' | 'music' | 'entrance'
    kind: varchar('kind', { length: 16 }).notNull(),
    label: varchar('label', { length: 80 }).notNull(),
    x: numeric('x', { precision: 5, scale: 2 }).notNull(),
    y: numeric('y', { precision: 5, scale: 2 }).notNull(),
    w: numeric('w', { precision: 5, scale: 2 }).notNull(),
    h: numeric('h', { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [index('venue_zones_event_idx').on(t.eventId)],
)

export const guestGroups = pgTable(
  'guest_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 160 }).notNull(),
    seats: integer('seats').notNull(),
    // SHA-256 del token; el token en claro no se guarda en ninguna parte.
    tokenHash: bytea('token_hash').notNull().unique(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    // Marca del atelier: «este enlace ya lo repartí». No es prueba de entrega — ni
    // WhatsApp ni el correo avisan de vuelta, y decir «entregado» sería mentir.
    invitationSentAt: timestamp('invitation_sent_at', { withTimezone: true }),
    // `set null`, no `cascade`: borrar una mesa deja a sus grupos sin mesa, no los borra.
    // Perder invitados por eliminar una mesa sería catastrófico y silencioso.
    tableId: uuid('table_id').references(() => venueTables.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guest_groups_event_idx').on(t.eventId), index('guest_groups_table_idx').on(t.tableId)],
)

export const rsvpResponses = pgTable(
  'rsvp_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestGroupId: uuid('guest_group_id')
      .notNull()
      .references(() => guestGroups.id, { onDelete: 'cascade' }),
    attending: integer('attending').notNull(),
    message: text('message'),
    respondedAt: timestamp('responded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('rsvp_responses_group_recent_idx').on(t.guestGroupId, t.respondedAt.desc())],
)

/**
 * Registro append-only de escaneos, no una fila por grupo. `scan_id` es la clave de
 * idempotencia que genera el dispositivo: reenviar el mismo lote veinte veces desde la
 * bandeja de salida inserta una vez. Dos puertas sin red producen dos filas en vez de
 * una carrera de escrituras perdidas, y deshacer deja lápida en vez de borrar.
 */
export const arrivals = pgTable(
  'arrivals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scanId: uuid('scan_id').notNull().unique(),
    guestGroupId: uuid('guest_group_id')
      .notNull()
      .references(() => guestGroups.id, { onDelete: 'cascade' }),
    arrivedCount: integer('arrived_count').notNull(),
    // Reloj del dispositivo. Puede estar mal; por eso existe `received_at`.
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
  },
  (t) => [index('arrivals_group_idx').on(t.guestGroupId, t.scannedAt.desc())],
)

export const clientShares = pgTable('client_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  tokenHash: bytea('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const eventsRelations = relations(events, ({ many }) => ({ guestGroups: many(guestGroups) }))
export const guestGroupsRelations = relations(guestGroups, ({ many, one }) => ({
  responses: many(rsvpResponses),
  arrivals: many(arrivals),
  event: one(events, { fields: [guestGroups.eventId], references: [events.id] }),
}))

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

/**
 * El estado editable de un mensaje del libro de firmas: leído, destacado y la respuesta
 * del atelier.
 *
 * **No guarda el cuerpo del mensaje.** El texto que escribió el invitado vive en
 * `rsvp_responses.message` desde la rebanada 1 y ahí se queda: copiarlo aquí daría dos
 * versiones del mismo texto que se desincronizan en cuanto alguien edite una. Y meter
 * `read_at` dentro de `rsvp_responses` ensuciaría un histórico que hasta hoy es
 * inmutable —una respuesta se escribe una vez y no se toca—, y esa propiedad vale más
 * que ahorrarse una tabla.
 *
 * `UNIQUE` sobre `rsvp_response_id`: una nota por mensaje. Las escrituras son
 * `INSERT ... ON CONFLICT DO UPDATE`, así que marcar leído dos veces no crea dos filas
 * ni revienta.
 */
export const messageNotes = pgTable(
  'message_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rsvpResponseId: uuid('rsvp_response_id')
      .notNull()
      .unique()
      .references(() => rsvpResponses.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    featuredAt: timestamp('featured_at', { withTimezone: true }),
    reply: text('reply'),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
  },
  // Índice parcial: los destacados son un puñado dentro de todos los mensajes, y la
  // vista del cliente solo pide esos.
  (t) => [index('message_notes_featured_idx').on(t.featuredAt).where(sql`${t.featuredAt} is not null`)],
)

/**
 * Una fila por visita a una invitación. Guarda **categorías**, no rastros: ni dirección
 * IP, ni agente de usuario, ni identificador de navegador. Lo que no se escribe no se
 * filtra, y el atelier solo necesita saber cuántos abrieron, desde qué clase de aparato
 * y por qué camino.
 *
 * `guest_group_id` admite nulo: la vista de solo lectura del cliente no es de ningún
 * grupo. La fila se borra con el evento, y la retención la barre por fecha.
 */
export const invitationViews = pgTable(
  'invitation_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    guestGroupId: uuid('guest_group_id').references(() => guestGroups.id, { onDelete: 'cascade' }),
    device: varchar('device', { length: 16 }).notNull(),
    source: varchar('source', { length: 16 }).notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('invitation_views_event_time_idx').on(t.eventId, t.viewedAt.desc())],
)

/**
 * Personas dentro de un grupo. **Aditivo**: el grupo sigue siendo el dueño del enlace,
 * del RSVP agregado, de la mesa y del pase de la puerta. Un grupo sin personas es el
 * estado de todos los eventos anteriores a esta tabla, y sigue siendo válido.
 *
 * `attending` nulo es pendiente; `maybe` es el «tal vez» que la maqueta pinta y que en
 * una boda existe de verdad.
 */
export const guestPeople = pgTable(
  'guest_people',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestGroupId: uuid('guest_group_id')
      .notNull()
      .references(() => guestGroups.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    isCompanion: boolean('is_companion').notNull().default(false),
    dietaryNote: text('dietary_note'),
    vip: boolean('vip').notNull().default(false),
    attending: varchar('attending', { length: 8 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guest_people_group_idx').on(t.guestGroupId)],
)
