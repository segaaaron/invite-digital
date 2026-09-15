import { relations } from 'drizzle-orm'
import { boolean, char, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { events } from './eventos'
import { timestamps } from './base'

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
  // Precio anual, para el conmutador de la maqueta. Nulo mientras el plan se cobre una
  // sola vez por evento, que es como se vende hoy.
  priceAnnualCents: integer('price_annual_cents'),
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
  /** Cuántos porteros puede sumar quien compró. Cero: el plan no trae puerta. */
  maxDoorPorters: integer('max_door_porters').notNull().default(0),
  /** Co-anfitriones que suma el anfitrión. `NULL` es sin límite. */
  maxCohosts: integer('max_cohosts').default(1),
  /** Planners contratados que suma. `NULL` es sin límite; cero, ninguno. */
  maxHiredPlanners: integer('max_hired_planners').default(0),
  /** `esencial` · `completo` · `total`: qué parte del planner trae. */
  plannerSuite: varchar('planner_suite', { length: 16 }).notNull().default('esencial'),
  /** Fotos de la galería de la invitación. `NULL` es sin límite. */
  maxGalleryPhotos: integer('max_gallery_photos'),
  guestPhotos: boolean('guest_photos').notNull().default(true),
  eventPassword: boolean('event_password').notNull().default(true),
  csvImport: boolean('csv_import').notNull().default(true),
  /** Días en línea tras el evento: se copia a la retención del evento al asignar el plan. */
  onlineDays: integer('online_days').notNull().default(90),
  /** `ninguno` · `antes_de_repartir` · `siempre`: cuándo se cambia el modelo dentro de su fiesta. */
  designChange: varchar('design_change', { length: 24 }).notNull().default('antes_de_repartir'),
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
    /**
     * Qué diseño pinta esta plantilla. Apunta al registro de temas de
     * `events/ui/themes/registry.ts`, y `pnpm preflight` falla si una fila publicada
     * apunta a una clave que el registro no conoce: vender un modelo que el motor no sabe
     * pintar es la clase de fallo que no se descubre hasta el día de la boda.
     */
    themeKey: varchar('theme_key', { length: 64 }).notNull(),
    palette: jsonb('palette').$type<{ base: string; accent: string }>().notNull(),
    // Los datos de escaparate que la tarjeta de modelo dibuja: monograma, nombres, fecha
    // y lugar. Son del catálogo, no del código, porque cambian con el escaparate.
    sampleMonogram: varchar('sample_monogram', { length: 16 }),
    sampleNames: varchar('sample_names', { length: 80 }),
    sampleDateLabel: varchar('sample_date_label', { length: 32 }),
    sampleVenue: varchar('sample_venue', { length: 120 }),
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
    // 'new' | 'contacted' | 'won' | 'lost'. Lo decide `leads/domain/pipeline.ts`.
    status: varchar('status', { length: 16 }).notNull().default('new'),
    note: text('note'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    // La boda que salió de la consulta. `set null`: borrar la boda no borra que hubo venta.
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('consultation_requests_created_idx').on(t.createdAt),
    index('consultation_requests_status_idx').on(t.status, t.createdAt.desc()),
  ],
)

export const plansRelations = relations(plans, ({ many }) => ({ translations: many(planTranslations) }))

export const templatesRelations = relations(templates, ({ many, one }) => ({
  translations: many(templateTranslations),
  category: one(eventCategories, { fields: [templates.categoryId], references: [eventCategories.id] }),
}))
