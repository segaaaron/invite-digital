import { and, count, inArray, ne, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { clientNotes, orders, referralCodes } from '@/shared/db/schema'
import type { ClientNotes, Referidos } from '../application/ports'

export const createDrizzleClientNotes = (database: DbExecutor): ClientNotes => ({
  async leer(claves) {
    if (claves.length === 0) return []
    return database
      .select({ clave: clientNotes.clave, note: clientNotes.note, tags: clientNotes.tags, updatedAt: clientNotes.updatedAt })
      .from(clientNotes)
      .where(inArray(clientNotes.clave, [...claves]))
  },

  async guardar(clave, note, tags) {
    await database
      .insert(clientNotes)
      .values({ clave, note, tags: [...tags] })
      .onConflictDoUpdate({ target: clientNotes.clave, set: { note, tags: [...tags], updatedAt: sql`now()` } })
  },
})

export const createDrizzleReferidos = (database: DbExecutor): Referidos => ({
  async deEventos(eventIds) {
    if (eventIds.length === 0) return new Map()
    const filas = await database.select({ eventId: referralCodes.eventId, code: referralCodes.code }).from(referralCodes).where(inArray(referralCodes.eventId, [...eventIds]))
    return new Map(filas.map((f) => [f.eventId, f.code]))
  },

  async crear(eventId, codigo) {
    // Uno por evento: si ya tenía, se queda el suyo (el `unique` de `event_id` lo decide).
    await database.insert(referralCodes).values({ code: codigo, eventId }).onConflictDoNothing()
    const [fila] = await database.select({ code: referralCodes.code }).from(referralCodes).where(sql`${referralCodes.eventId} = ${eventId}`)
    if (fila === undefined) throw new Error('No se pudo leer el código de referido recién creado.')
    return fila.code
  },

  async existe(codigo) {
    const [fila] = await database.select({ total: count() }).from(referralCodes).where(sql`${referralCodes.code} = ${codigo}`)
    return (fila?.total ?? 0) > 0
  },

  async usos(codigos) {
    if (codigos.length === 0) return new Map()
    const filas = await database
      .select({ code: orders.referralCode, total: count() })
      .from(orders)
      .where(and(inArray(orders.referralCode, [...codigos]), ne(orders.status, 'cancelled')))
      .groupBy(orders.referralCode)
    return new Map(filas.filter((f): f is { code: string; total: number } => f.code !== null).map((f) => [f.code, f.total]))
  },

  async anfitrionesDe(codigo) {
    // Nombres escritos a mano y cualificados: dentro de un `sql` interpolado Drizzle los emite sin tabla.
    const filas = (await database.execute(sql`
      select e.title as evento,
             coalesce(array_agg(u.email::text) filter (where u.email is not null), '{}') as correos
      from referral_codes r
      join events e on e.id = r.event_id
      left join event_staff s on s.event_id = e.id and s.membership = 'cliente'
      left join users u on u.id = s.user_id
      where r.code = ${codigo}
      group by e.title
    `)) as unknown as Array<{ evento: string; correos: string[] }>
    const fila = filas[0]
    return fila === undefined ? null : { evento: fila.evento, correos: fila.correos }
  },
})

export const drizzleClientNotes = createDrizzleClientNotes(db)
export const drizzleReferidos = createDrizzleReferidos(db)
