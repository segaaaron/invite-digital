import { relations, sql } from 'drizzle-orm'
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { plans } from './catalogo'
import { users } from './identidad'
import { guestGroups } from './invitados'
import { bytea, timestamps } from './base'

/**
 * Quién entra en qué evento sin ser su dueño: el personal de puerta y el cliente.
 *
 * Es una **pertenencia**, no un dato, y por eso va con `cascade` por los dos lados:
 * borrado el evento o el usuario, el permiso no significa nada. Lo que nunca cae en
 * cascada son los datos — `events.user_id` va con `restrict`.
 *
 * `membership` dice de qué clase es. Una tabla por clase duplicaría el repositorio y el
 * barrido de la retención para cambiar una palabra, y es donde se olvida uno de los dos.
 * El cliente **no** es el dueño del evento: el dueño es el atelier que vendió la boda.
 */
export const eventStaff = pgTable(
  'event_staff',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 'puerta' por defecto: es lo único que esta tabla guardaba antes de la 0032.
    membership: varchar('membership', { length: 16 }).notNull().default('puerta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] }), index('event_staff_user_idx').on(t.userId)],
)

/**
 * Un código QR que apunta a **nosotros** y redirige.
 *
 * Un QR con la dirección final dentro queda muerto el día que esa tienda cambia el
 * enlace, y para entonces ya está impreso. Con este, se cambia una fila.
 *
 * `scanCount` y `lastScanAt` en vez de una tabla de escaneos: lo que la pantalla enseña
 * es «cuántos» y «cuándo el último». Una fila por escaneo solo haría falta para dibujar
 * una serie en el tiempo, y ese día será su propia tabla.
 */
export const qrCodes = pgTable(
  'qr_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /**
     * Quién lo creó. Es **procedencia, no propiedad**: el código pertenece al evento.
     * `set null` como `audit_log.actor_user_id` — el rastro de quién hizo qué no puede
     * impedir dar de baja a nadie.
     */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 120 }).notNull(),
    // 'registry' | 'store' | 'custom'
    kind: varchar('kind', { length: 24 }).notNull().default('custom'),
    target: text('target').notNull(),
    active: boolean('active').notNull().default(true),
    scanCount: integer('scan_count').notNull().default(0),
    lastScanAt: timestamp('last_scan_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('qr_codes_event_idx').on(t.eventId, t.createdAt.desc())],
)

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  /**
   * El atelier al que pertenece el evento.
   *
   * `restrict`, nunca `cascade`: borrar un usuario no puede llevarse por delante las
   * bodas que gestiona. El admin reasigna o borra los eventos primero, y la pantalla se
   * lo dice con el número.
   *
   * Anulable solo porque la columna nació después que los datos; la migración `0021` no
   * dejó ninguna fila sin dueño.
   */
  userId: uuid('user_id').references(() => users.id, { onDelete: 'restrict' }),
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
  // Dónde es. La maqueta lo pide en Configuración y lo enseña en la vista previa; sin él
  // la invitación no decía el lugar en ninguna parte.
  venue: varchar('venue', { length: 160 }),
  // La moneda de la mesa de regalos de este evento. Por defecto BOB, que es lo que había
  // clavado en el código hasta que la maqueta pidió elegirla.
  currency: varchar('currency', { length: 3 }).notNull().default('BOB'),
  // Hash de la contraseña de acceso, nunca la contraseña. Nulo = evento público: basta
  // con tener el enlace, que es lo que había hasta ahora.
  accessPasswordHash: text('access_password_hash'),
  // Plantilla del mensaje de reparto, con {nombre} y {enlace}. Nunca guarda un enlace
  // dentro: el enlace se pega al abrir WhatsApp, no aquí.
  messageTemplate: text('message_template'),
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
 * El contenido rico de la invitación: lo que los dieciséis diseños pintan y `events` no
 * guarda —ceremonia y recepción por separado, itinerario, galería, código de vestimenta,
 * anfitriones, canción, y la hora del evento para la cuenta atrás—.
 *
 * Un solo `jsonb` y no diecinueve columnas: se lee entero, se edita entero y tres de los
 * bloques son listas. La base garantiza que es JSON; que sea **este** JSON lo garantiza
 * `domain/invitation-content.ts`, que lo valida al leer y al escribir.
 *
 * `CASCADE` porque el contenido no significa nada sin su evento, igual que `event_staff`.
 */
export const eventContent = pgTable('event_content', {
  eventId: uuid('event_id')
    .primaryKey()
    .references(() => events.id, { onDelete: 'cascade' }),
  blocks: jsonb('blocks').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
})

/**
 * Las imágenes que el atelier sube para una invitación: retrato, portada, galería y los
 * iconos del itinerario.
 *
 * El fichero vive en disco, **fuera de `public/`**, y esta tabla guarda de quién es y qué
 * es. En `public/` estaría publicado en internet, y una foto de la novia no se sirve a
 * quien adivine el nombre del archivo. Lo entrega `GET /media/[id]`, con la misma puerta
 * de contraseña que la invitación.
 */
export const eventMedia = pgTable(
  'event_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    /** Decidido por los primeros bytes, nunca por la extensión ni por el `Content-Type`. */
    contentType: varchar('content_type', { length: 32 }).notNull(),
    /** Solo para enseñarlo: el fichero en disco se llama por el `id`. */
    originalName: varchar('original_name', { length: 255 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    /**
     * Qué grupo de invitados la subió, o `null` si la subió el atelier.
     *
     * `set null` y no `cascade`: borrado el grupo, la fotografía **se queda** —es de la
     * pareja— y lo que se pierde es saber quién la trajo, que es el dato personal.
     */
    uploadedByGroupId: uuid('uploaded_by_group_id').references(() => guestGroups.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('event_media_event_idx').on(t.eventId), index('event_media_group_idx').on(t.uploadedByGroupId)],
)

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
