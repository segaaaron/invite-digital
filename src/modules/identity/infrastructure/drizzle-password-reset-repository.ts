import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { passwordResets } from '@/shared/db/schema'
import type { PasswordResetRepository } from '../application/ports'

export const createDrizzlePasswordResetRepository = (database: DbExecutor): PasswordResetRepository => ({
  async issue({ userId, codeHash, expiresAt }) {
    // Pedir uno nuevo invalida los anteriores: si no, el correo viejo —que pudo quedarse
    // en una bandeja ajena— seguiría sirviendo hasta caducar.
    await database.delete(passwordResets).where(eq(passwordResets.userId, userId))
    await database.insert(passwordResets).values({ userId, codeHash, expiresAt })
  },

  async findLive(userId) {
    const [fila] = await database
      .select({
        id: passwordResets.id,
        codeHash: passwordResets.codeHash,
        expiresAt: passwordResets.expiresAt,
        consumedAt: passwordResets.consumedAt,
        attempts: passwordResets.attempts,
      })
      .from(passwordResets)
      .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.consumedAt)))
      // El más reciente: `issue` borra los anteriores, pero ordenar deja el contrato claro
      // sin depender de que esa limpieza haya corrido.
      .orderBy(desc(passwordResets.createdAt))
      .limit(1)

    return fila ?? null
  },

  async countAttempt(id) {
    // `attempts + 1` en la base, no leyendo y volviendo a escribir: dos intentos a la vez
    // perderían una cuenta, y eso es justo lo que aquí se cuenta.
    //
    // El nombre va escrito a mano y cualificado: Drizzle emite las columnas **sin
    // cualificar** dentro de un `sql` interpolado, y en este proyecto eso ya convirtió una
    // condición en otra distinta sin un solo error.
    await database
      .update(passwordResets)
      .set({ attempts: sql`"password_resets"."attempts" + 1` })
      .where(eq(passwordResets.id, id))
  },

  async consume(id, at) {
    await database.update(passwordResets).set({ consumedAt: at }).where(eq(passwordResets.id, id))
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
