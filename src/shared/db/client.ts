import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/shared/config/env'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { __invitePg?: ReturnType<typeof postgres> }

const client = globalForDb.__invitePg ?? postgres(env.DATABASE_URL, { max: 10, idle_timeout: 20 })

if (env.NODE_ENV !== 'production') globalForDb.__invitePg = client

export const db = drizzle(client, { schema })
export type Database = typeof db
