import { lt, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { passwordResets } from '@/shared/db/schema'
import { MAX_CODIGOS_POR_VENTANA, MAX_FALLOS_POR_VENTANA, MAX_OTP_ATTEMPTS, VENTANA_DE_CUENTA_MS } from '../domain/password-reset'
import type { PasswordResetRepository } from '../application/ports'

/**
 * El código de recuperación, con los topes **de la cuenta** en la base (`0097`).
 *
 * Las fechas viajan como texto ISO con su `::timestamptz`: un `Date` interpolado en un `sql` crudo
 * lo intenta serializar el driver y revienta con «Received an instance of Date».
 *
 * Las dos sentencias de aquí son de una pieza a propósito: emitir y cobrar un intento deciden y
 * escriben en la misma consulta. Leer, juzgar en TypeScript y escribir después deja un hueco por
 * el que dos peticiones a la vez se cuelan, y eso es exactamente lo que se cuenta (F8).
 *
 * Las columnas van **cualificadas a mano**: Drizzle las emite sin cualificar dentro de un `sql`
 * interpolado, y en este proyecto eso ya convirtió una condición en otra distinta sin un error.
 */
export const createDrizzlePasswordResetRepository = (database: DbExecutor): PasswordResetRepository => ({
  async issue({ userId, codeHash, expiresAt, now, pendingEmail = null }) {
    const inicioDeVentana = new Date(now.getTime() - VENTANA_DE_CUENTA_MS).toISOString()
    const ahora = now.toISOString()
    // `on conflict`, no borrar e insertar: la fila de la cuenta es la que lleva la cuenta de
    // códigos y de fallos de la hora, y borrarla era regalar el contador (F2).
    const emitidas = (await database.execute(sql`
      insert into password_resets (user_id, code_hash, expires_at, attempts, issued_count, failed_count, window_at, created_at, pending_email)
      values (${userId}, ${codeHash}, ${expiresAt.toISOString()}::timestamptz, 0, 1, 0, ${ahora}::timestamptz, ${ahora}::timestamptz, ${pendingEmail}::citext)
      on conflict (user_id) do update set
        code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        consumed_at = null,
        attempts = 0,
        created_at = excluded.created_at,
        -- Para qué se emitió este código: una dirección nueva, o nada (migración 0098).
        pending_email = excluded.pending_email,
        issued_count = case when "password_resets"."window_at" < ${inicioDeVentana}::timestamptz then 1 else "password_resets"."issued_count" + 1 end,
        -- Los fallos **no** se reinician al pedir otro código: son de la cuenta, no del código.
        failed_count = case when "password_resets"."window_at" < ${inicioDeVentana}::timestamptz then 0 else "password_resets"."failed_count" end,
        window_at = case when "password_resets"."window_at" < ${inicioDeVentana}::timestamptz then ${ahora}::timestamptz else "password_resets"."window_at" end
      where "password_resets"."window_at" < ${inicioDeVentana}::timestamptz
         or "password_resets"."issued_count" < ${MAX_CODIGOS_POR_VENTANA}
      returning id
    `)) as unknown as { id: string }[]

    return emitidas.length > 0 ? 'emitido' : 'demasiados'
  },

  async cobrarIntento(userId, now) {
    const inicioDeVentana = new Date(now.getTime() - VENTANA_DE_CUENTA_MS).toISOString()
    const ahora = now.toISOString()
    const filas = (await database.execute(sql`
      update password_resets set
        attempts = "password_resets"."attempts" + 1,
        failed_count = case when "password_resets"."window_at" < ${inicioDeVentana}::timestamptz then 1 else "password_resets"."failed_count" + 1 end,
        window_at = case when "password_resets"."window_at" < ${inicioDeVentana}::timestamptz then ${ahora}::timestamptz else "password_resets"."window_at" end
      where "password_resets"."user_id" = ${userId}
        and "password_resets"."consumed_at" is null
        and "password_resets"."expires_at" > ${ahora}::timestamptz
        and "password_resets"."attempts" < ${MAX_OTP_ATTEMPTS}
        and (
          "password_resets"."window_at" < ${inicioDeVentana}::timestamptz
          or "password_resets"."failed_count" < ${MAX_FALLOS_POR_VENTANA}
        )
      returning id, code_hash, pending_email
    `)) as unknown as { id: string; code_hash: Buffer; pending_email: string | null }[]

    const fila = filas[0]
    if (fila !== undefined) return { estado: 'cobrado', id: fila.id, codeHash: fila.code_hash, pendingEmail: fila.pending_email }

    // No se cobró: una **segunda** lectura dice por qué, y solo en el camino del fallo. La
    // sentencia de arriba sigue siendo de una pieza (F8): esto no concede ningún intento, solo
    // distingue «no hay código vivo» —pide uno nuevo— de «esta cuenta agotó sus fallos de la
    // hora» —pedir otro código no sirve, hay que esperar—, que es lo que la pantalla tiene que
    // decir para no dejar a nadie dando vueltas.
    const estado = (await database.execute(sql`
      select "password_resets"."window_at" as window_at, "password_resets"."failed_count" as failed_count
      from password_resets
      where "password_resets"."user_id" = ${userId}
    `)) as unknown as { window_at: Date | string; failed_count: number }[]

    const cuenta = estado[0]
    if (cuenta === undefined) return { estado: 'sin_codigo' }
    const ventana = new Date(cuenta.window_at).getTime()
    const vigente = ventana > now.getTime() - VENTANA_DE_CUENTA_MS
    if (vigente && cuenta.failed_count >= MAX_FALLOS_POR_VENTANA) return { estado: 'sin_intentos', hasta: new Date(ventana + VENTANA_DE_CUENTA_MS) }
    return { estado: 'sin_codigo' }
  },

  async consume(id, at) {
    await database.update(passwordResets).set({ consumedAt: at }).where(sql`"password_resets"."id" = ${id}`)
  },

  async deleteExpired(now) {
    const borrados = await database
      .delete(passwordResets)
      .where(lt(passwordResets.expiresAt, now))
      .returning({ id: passwordResets.id })
    return borrados.length
  },
})

export const drizzlePasswordResetRepository = createDrizzlePasswordResetRepository(db)
