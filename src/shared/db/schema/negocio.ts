import { sql } from 'drizzle-orm'
import { boolean, char, check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { plans } from './catalogo'
import { events } from './eventos'

/**
 * Un pedido del Plan B. `plan_id` es `set null`, nunca `cascade`: retirar un plan del
 * catálogo no puede llevarse por delante los pedidos que lo compraron.
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Ocho caracteres sin 0/O/1/I/L: se dicta por teléfono.
    publicRef: varchar('public_ref', { length: 16 }).notNull().unique(),
    planId: uuid('plan_id').references(() => plans.id, { onDelete: 'set null' }),
    /**
     * El diseño que el cliente eligió en el escaparate, si pasó por él.
     *
     * Es la clave del tema, la misma que `templates.theme_key`. Anulable: quien compra un
     * plan sin mirar modelos no elige ninguno, y entonces el evento nace con el clásico.
     * No es una clave foránea porque los temas viven en el código, no en una tabla.
     */
    templateSlug: varchar('template_slug', { length: 64 }),
    /**
     * La boda que nació de este pedido al aprobarlo.
     *
     * Va en la base y no en el estado de la pantalla porque ese estado **se pierde al
     * aprobar**: la acción revalida, el pedido deja de estar «por revisar» y el formulario
     * de decisión se desmonta con su mensaje dentro.
     *
     * `SET NULL`: borrar la boda no borra el registro del pago.
     */
    /** El extra que compra, si el pedido es de un extra y no de un plan. */
    addonSlug: varchar('addon_slug', { length: 32 }).references(() => addons.slug, { onDelete: 'set null' }),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    customerName: varchar('customer_name', { length: 160 }).notNull(),
    contact: varchar('contact', { length: 160 }).notNull(),
    /**
     * Lo que costaba el plan **cuando se pidió**. Anulable solo por los pedidos anteriores
     * a la `0037` sin plan. Sin esta columna, editar un precio reescribiría lo ya cobrado.
     */
    amountCents: integer('amount_cents'),
    currency: char('currency', { length: 3 }),
    eventDate: date('event_date'),
    notes: text('notes'),
    // 'pending_payment' | 'proof_submitted' | 'approved' | 'rejected'
    status: varchar('status', { length: 24 }).notNull().default('pending_payment'),
    decisionNote: text('decision_note'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('orders_status_idx').on(t.status, t.createdAt.desc()),
    index('orders_decided_idx').on(t.status, t.decidedAt),
    // Un pedido abierto por evento y extra (`0048`): pedir otra vez devuelve el mismo.
    uniqueIndex('orders_extra_abierto_idx')
      .on(t.eventId, t.addonSlug)
      .where(sql`${t.addonSlug} is not null and ${t.eventId} is not null and ${t.status} <> 'approved'`),
  ],
)

/**
 * Los comprobantes de un pedido. Son **varios**: un rechazo lleva a otra subida, y lo que
 * se mandó antes es parte de la conversación.
 *
 * `storage_key` es el nombre con el que el fichero vive en disco, y es un UUID.
 * `original_name` se guarda solo para enseñarlo: usarlo para construir una ruta sería
 * dejar que quien sube el fichero elija dónde se escribe.
 */
export const orderProofs = pgTable(
  'order_proofs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    storageKey: uuid('storage_key').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mime: varchar('mime', { length: 64 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('order_proofs_order_idx').on(t.orderId, t.uploadedAt.desc())],
)

/**
 * Los extras sueltos. Se compran como pedido y, aprobados, suben un límite del evento. El
 * efecto guarda qué hace; la cantidad, cuánto. Nacen apagados: venderlos lo decide el admin.
 */
export const addons = pgTable(
  'addons',
  {
    slug: varchar('slug', { length: 32 }).primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('BOB'),
    effect: varchar('effect', { length: 24 }).notNull(),
    amount: integer('amount').notNull().default(0),
    isActive: boolean('is_active').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    check('addons_effect_check', sql`${t.effect} in ('cambio_modelo', 'fotos_invitados', 'mas_grupos', 'mas_dias', 'mas_porteros', 'sumar_planner', 'dia_d', 'servicio')`),
    check('addons_price_check', sql`${t.priceCents} >= 0 and ${t.amount} >= 0`),
  ],
)

/** Lo que compró cada evento. El efecto y la cantidad se copian: editar el extra no reescribe lo vendido. */
export const eventAddons = pgTable(
  'event_addons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    addonSlug: varchar('addon_slug', { length: 32 }).references(() => addons.slug, { onDelete: 'set null' }),
    effect: varchar('effect', { length: 24 }).notNull(),
    amount: integer('amount').notNull().default(0),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('event_addons_event_idx').on(t.eventId), uniqueIndex('event_addons_order_idx').on(t.orderId)],
)
