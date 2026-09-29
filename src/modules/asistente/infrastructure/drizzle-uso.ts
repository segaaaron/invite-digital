import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { assistantUsage } from '@/shared/db/schema'
import { costeMicroUsd, type UsoDeTokens } from '../domain/config'

/** Lo que gasta Arturo, por evento y mes (`assistant_usage`). */
export const drizzleUsoDelAsistente = {
  /** Mensajes del evento este mes y gasto del mes de todo el sitio: lo que decide si se responde. */
  async usoDe(eventId: string, mes: string): Promise<{ mensajesDelMes: number; gastoDelMesMicroUsd: number }> {
    const [evento] = await db
      .select({ n: assistantUsage.messages })
      .from(assistantUsage)
      .where(and(eq(assistantUsage.eventId, eventId), eq(assistantUsage.month, mes)))
    const [total] = await db
      .select({ gasto: sql<number>`coalesce(sum(${assistantUsage.costMicroUsd}), 0)::bigint` })
      .from(assistantUsage)
      .where(eq(assistantUsage.month, mes))
    return { mensajesDelMes: evento?.n ?? 0, gastoDelMesMicroUsd: Number(total?.gasto ?? 0) }
  },

  /** Suma un mensaje y sus tokens, **en la base** (`+`): dos mensajes a la vez no se pisan. */
  async registrar(eventId: string, mes: string, uso: UsoDeTokens): Promise<void> {
    const coste = costeMicroUsd(uso)
    await db
      .insert(assistantUsage)
      .values({ eventId, month: mes, messages: 1, inputTokens: uso.entrada, outputTokens: uso.salida, costMicroUsd: coste })
      .onConflictDoUpdate({
        target: [assistantUsage.eventId, assistantUsage.month],
        set: {
          messages: sql`${assistantUsage.messages} + 1`,
          inputTokens: sql`${assistantUsage.inputTokens} + ${uso.entrada}`,
          outputTokens: sql`${assistantUsage.outputTokens} + ${uso.salida}`,
          costMicroUsd: sql`${assistantUsage.costMicroUsd} + ${coste}`,
        },
      })
  },

  /** El mes entero, para el admin: mensajes, eventos que lo usaron y lo gastado. */
  async resumenDelMes(mes: string): Promise<{ mensajes: number; eventos: number; gastoMicroUsd: number }> {
    const [fila] = await db
      .select({
        mensajes: sql<number>`coalesce(sum(${assistantUsage.messages}), 0)::int`,
        eventos: sql<number>`count(*)::int`,
        gasto: sql<number>`coalesce(sum(${assistantUsage.costMicroUsd}), 0)::bigint`,
      })
      .from(assistantUsage)
      .where(eq(assistantUsage.month, mes))
    return { mensajes: fila?.mensajes ?? 0, eventos: fila?.eventos ?? 0, gastoMicroUsd: Number(fila?.gasto ?? 0) }
  },
}
