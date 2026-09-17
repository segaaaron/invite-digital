import { relations, sql } from 'drizzle-orm'
import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './identidad'
import { events } from './eventos'
import { venueTables } from './salon-y-regalos'
import { bytea } from './base'

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
    // El token, cifrado (`shared/security/sello`): el panel vuelve a enseñar el enlace y su QR
    // sin que un volcado de la base los entregue. Nulo en las invitaciones de antes de `0062`.
    tokenSealed: text('token_sealed'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    // Marca del atelier: «este enlace ya lo repartí». No es prueba de entrega — ni
    // WhatsApp ni el correo avisan de vuelta, y decir «entregado» sería mentir.
    invitationSentAt: timestamp('invitation_sent_at', { withTimezone: true }),
    // Cuándo se le permitió volver a responder. Se contesta una sola vez —el enlace circula
    // por el chat de toda la familia—, y esta marca es la única forma de corregir: la pone el
    // atelier desde el panel, y solo vale para la respuesta que venga después.
    rsvpReopenedAt: timestamp('rsvp_reopened_at', { withTimezone: true }),
    // Teléfono para abrir WhatsApp con el destinatario ya puesto. Dato personal del
    // invitado: la anonimización de la retención lo borra, como la etiqueta.
    phone: varchar('phone', { length: 32 }),
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
    /**
     * Quién de la familia contesta. El enlace identifica **al grupo**, no a la persona.
     *
     * Es dato personal: la retención lo anonimiza junto con el mensaje.
     */
    responderName: varchar('responder_name', { length: 120 }),
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
    /** `porter:<id>` o `user:<id>`: quién registró la llegada. Nulo en las anteriores a la 0040. */
    recordedBy: varchar('recorded_by', { length: 120 }),
    /** Quiénes entraron en este escaneo. Nulo: escaneo por número (sin personas cargadas). */
    personIds: uuid('person_ids').array(),
  },
  (t) => [index('arrivals_group_idx').on(t.guestGroupId, t.scannedAt.desc())],
)

/**
 * Porteros: la gente de la puerta que suma quien compró el evento, **sin cuenta**.
 *
 * Entran con un enlace personal y un PIN, de los que solo se guarda el hash. Pertenecen a
 * un evento y caen con él; solo pueden registrar llegadas de ese evento y en su ventana
 * horaria, que el servidor comprueba en cada petición.
 */
export const doorPorters = pgTable(
  'door_porters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    gate: varchar('gate', { length: 40 }),
    tokenHash: bytea('token_hash').notNull().unique(),
    pinHash: bytea('pin_hash').notNull(),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    opensHoursBefore: integer('opens_hours_before').notNull().default(6),
    closesHoursAfter: integer('closes_hours_after').notNull().default(4),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('door_porters_event_idx').on(t.eventId)],
)

export const guestGroupsRelations = relations(guestGroups, ({ many, one }) => ({
  responses: many(rsvpResponses),
  arrivals: many(arrivals),
  event: one(events, { fields: [guestGroups.eventId], references: [events.id] }),
}))

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
 * Cuándo se recordó qué a quién. Es lo único que hace que la cola de recordatorios
 * encoja: sin este registro el mismo grupo vuelve a salir todos los días.
 *
 * No guarda un solo dato personal —el grupo, el motivo y la fecha—, así que la
 * anonimización de la retención no tiene nada que borrar aquí, y el `cascade` se lo lleva
 * con el grupo.
 */
export const reminderLog = pgTable(
  'reminder_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestGroupId: uuid('guest_group_id')
      .notNull()
      .references(() => guestGroups.id, { onDelete: 'cascade' }),
    // 'sin_abrir' | 'sin_respuesta'
    kind: varchar('kind', { length: 16 }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('reminder_log_group_idx').on(t.guestGroupId, t.kind, t.sentAt.desc())],
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
    // Correo del invitado. Dato personal: la retención lo anonimiza con el nombre.
    email: varchar('email', { length: 160 }),
    attending: varchar('attending', { length: 8 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guest_people_group_idx').on(t.guestGroupId)],
)
