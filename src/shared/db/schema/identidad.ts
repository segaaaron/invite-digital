import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { events } from './eventos'
import { bytea, citext } from './base'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // 'admin' | 'atelier'. Por defecto el de menos poder: un rol que se otorga por olvido
  // no es un rol.
  role: varchar('role', { length: 16 }).notNull().default('atelier'),
  /**
   * La contraseña actual la escribió otro y viaja por correo.
   *
   * Mientras esté en `true`, el panel no deja hacer nada más que cambiarla: quien la
   * escribió —el admin— podría entrar como el cliente, y una clave que ha viajado por
   * correo no puede ser la definitiva.
   */
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  /** Quién es y cómo se le llama. Lo trae el pedido o el alta del admin; sin él, el correo. */
  fullName: varchar('full_name', { length: 160 }),
  phone: varchar('phone', { length: 32 }),
  // El plan que compró. Lo asigna el admin al darlo de alta. `set null`: retirar un plan no
  // borra la cuenta.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Los códigos de un solo uso para recuperar la contraseña.
 *
 * Del código solo vive aquí su SHA-256, como los tokens de invitado y los de sesión: de
 * la base no se puede sacar ninguno. `consumedAt` lo gasta —vale una vez— y `attempts`
 * corta la fuerza bruta sobre seis dígitos, que son un millón de combinaciones y se
 * prueban solas si nadie cuenta los intentos.
 */
export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: bytea('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('password_resets_user_idx').on(t.userId), index('password_resets_expires_idx').on(t.expiresAt)],
)

/**
 * Ajustes que el administrador cambia sin desplegar. Hoy, los datos de cobro del Plan B.
 *
 * Clave y valor, no una columna por ajuste: cada ajuste nuevo sería una migración, y son
 * cadenas que solo lee la pantalla que las enseña. El día que haya que consultarlos por su
 * contenido, ese ajuste merece su propia tabla.
 */
/**
 * El historial de «La web»: cada guardado deja la foto completa de los datos del negocio.
 * Restaurar es volver a guardar una foto, que deja otra. `actor_email` copiado como texto,
 * como la auditoría: borrar al admin no borra el rastro.
 */
export const siteSettingsVersions = pgTable(
  'site_settings_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    data: jsonb('data').notNull(),
    campos: text('campos').array().notNull().default(sql`'{}'`),
    actorEmail: text('actor_email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('site_settings_versions_created_idx').on(t.createdAt.desc())],
)

export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Quién hizo qué y cuándo en la administración.
 *
 * `actorUserId` va con `set null` y `actorEmail` es **texto copiado**, no una unión:
 * borrar al admin no puede borrar el rastro de lo que hizo. Un registro de auditoría que
 * desaparece con su autor no es un registro de auditoría.
 *
 * No se anota ninguna lectura: eso sería un rastro de navegación del atelier, y lo que no
 * se escribe no se filtra.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: varchar('actor_email', { length: 160 }).notNull(),
    action: varchar('action', { length: 48 }).notNull(),
    subject: varchar('subject', { length: 160 }),
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('audit_log_recent_idx').on(t.createdAt.desc())],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // La cookie lleva un token opaco; aquí solo vive su SHA-256.
    tokenHash: bytea('token_hash').notNull().unique(),
    // El modo soporte abierto de esta sesión de admin (`0049`). La FK la declara la migración:
    // `support_sessions` se define más abajo y referencia a `users` y `events`.
    supportSessionId: uuid('support_session_id'),
    /** «iPhone · Safari»: dónde está abierta, para reconocerla en Mi cuenta (`0057`). */
    device: varchar('device', { length: 80 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sessions_expires_idx').on(t.expiresAt)],
)

/**
 * Cada vez que el admin entra «como el cliente» (`0049`): quién, como quién, en qué boda y por
 * qué. Sin vencimiento: se cierra al regresar o al cerrar la sesión.
 */
export const supportSessions = pgTable(
  'support_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminUserId: uuid('admin_user_id').references(() => users.id, { onDelete: 'set null' }),
    adminEmail: text('admin_email').notNull(),
    clientUserId: uuid('client_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [index('support_sessions_event_idx').on(t.eventId)],
)
