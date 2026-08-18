import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/shared/config/env'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { __invitePg?: ReturnType<typeof postgres> }

const client = globalForDb.__invitePg ?? postgres(env.DATABASE_URL, { max: 10, idle_timeout: 20 })

if (env.NODE_ENV !== 'production') globalForDb.__invitePg = client

export const db = drizzle(client, { schema })
export type Database = typeof db

// Cualquier ejecutor de consultas compatible con `db`: el cliente normal o una
// transacción (`db.transaction(async (tx) => ...)`). Se deriva del propio tipo de
// `db.transaction` en vez de importar los tipos internos de drizzle-orm/postgres-js,
// para no acoplarse a su forma exacta. Permite inyectar `tx` en los repositorios desde
// las pruebas de integración que necesitan revertir sus cambios (`ROLLBACK`).
export type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0]
