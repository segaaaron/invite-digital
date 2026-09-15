import { customType, timestamp } from 'drizzle-orm/pg-core'

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

// Postgres tiene `bytea` y `citext`, pero drizzle-orm/pg-core no los expone: se
// declaran a mano para que el esquema tipado no mienta. `citext` además necesita la
// extensión, que la migración crea antes de las tablas.
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })

export const citext = customType<{ data: string }>({ dataType: () => 'citext' })
