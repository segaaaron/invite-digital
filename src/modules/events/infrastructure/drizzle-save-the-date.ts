import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventAddons, eventSaveDates } from '@/shared/db/schema'
import { env } from '@/shared/config/env'
import { crearSello } from '@/shared/security/sello'
import { createTokenMinter } from '@/shared/security/tokens'

const sello = crearSello(env.LINK_KEY ?? env.DATABASE_URL)
const minter = createTokenMinter()

/** El extra que lo vende (`0087`). */
export const EXTRA_SAVE_THE_DATE = 'save-the-date'

/**
 * El enlace del «save the date» (`0087`): se busca por hash, como los de invitado, y se guarda
 * sellado para volver a enseñarlo. Crear otro invalida el anterior.
 */
export const drizzleSaveTheDate = {
  async crear(eventId: string): Promise<string> {
    const { token, hash } = minter.mint()
    const valores = { tokenHash: hash, tokenSealed: sello.sellar(token) }
    await db.insert(eventSaveDates).values({ eventId, ...valores }).onConflictDoUpdate({ target: eventSaveDates.eventId, set: valores })
    return token
  },

  async leer(eventId: string): Promise<string | null> {
    const [f] = await db.select({ sellado: eventSaveDates.tokenSealed }).from(eventSaveDates).where(eq(eventSaveDates.eventId, eventId)).limit(1)
    return f === undefined ? null : sello.abrir(f.sellado)
  },

  async resolver(token: string): Promise<string | null> {
    const [f] = await db.select({ eventId: eventSaveDates.eventId }).from(eventSaveDates).where(eq(eventSaveDates.tokenHash, minter.hashOf(token))).limit(1)
    return f?.eventId ?? null
  },

  async quitar(eventId: string): Promise<void> {
    await db.delete(eventSaveDates).where(eq(eventSaveDates.eventId, eventId))
  },

  /** Si el evento compró el extra (aplicado al aprobar su pedido o en una cotización). */
  async comprado(eventId: string): Promise<boolean> {
    const [f] = await db
      .select({ uno: sql<number>`1` })
      .from(eventAddons)
      .where(and(eq(eventAddons.eventId, eventId), eq(eventAddons.addonSlug, EXTRA_SAVE_THE_DATE)))
      .limit(1)
    return f !== undefined
  },
}
