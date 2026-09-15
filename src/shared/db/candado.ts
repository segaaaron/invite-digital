import { sql } from 'drizzle-orm'
import { db, type DbExecutor } from './client'

/**
 * Corre `fn` en una transacción con un candado de Postgres sobre `clave`: dos llamadas con la
 * misma clave van una detrás de otra, aunque lleguen de dos servidores. Es lo que hace falta
 * para «contar y luego escribir» contra un tope —porteros, equipo—: sin él, dos altas a la vez
 * cuentan las dos «2 de 3» y entran las dos.
 *
 * `pg_advisory_xact_lock` y no `for update`: bloquea un nombre, exista o no una fila, y se
 * suelta solo al cerrar la transacción.
 */
export const enExclusiva = <T>(clave: string, fn: (tx: DbExecutor) => Promise<T>): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${clave}))`)
    return fn(tx)
  })
