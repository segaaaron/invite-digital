import { relations } from 'drizzle-orm'
import {
  boolean,
  char,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
  anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  ...timestamps,
})

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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guest_groups_event_idx').on(t.eventId)],
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
  event: one(events, { fields: [guestGroups.eventId], references: [events.id] }),
}))
