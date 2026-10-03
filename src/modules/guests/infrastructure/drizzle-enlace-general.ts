import { eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventOpenLinks } from '@/shared/db/schema'
import { env } from '@/shared/config/env'
import { crearSello } from '@/shared/security/sello'
import { createTokenMinter } from '@/shared/security/tokens'

const sello = crearSello(env.LINK_KEY ?? env.DATABASE_URL)
const minter = createTokenMinter()

/**
 * El enlace general de un evento (`0086`). Se busca por el hash, como los de invitado; el sellado
 * es solo para volver a enseñarlo en el panel. Crear otro invalida el anterior.
 */
export const drizzleEnlaceGeneral = {
  async crear(eventId: string): Promise<string> {
    const { token, hash } = minter.mint()
    const valores = { tokenHash: hash, tokenSealed: sello.sellar(token) }
    await db.insert(eventOpenLinks).values({ eventId, ...valores }).onConflictDoUpdate({ target: eventOpenLinks.eventId, set: valores })
    return token
  },

  async leer(eventId: string): Promise<string | null> {
    const [f] = await db.select({ sellado: eventOpenLinks.tokenSealed }).from(eventOpenLinks).where(eq(eventOpenLinks.eventId, eventId)).limit(1)
    return f === undefined ? null : sello.abrir(f.sellado)
  },

  /** El evento de un enlace general, o `null` si no existe o se quitó. */
  async resolver(token: string): Promise<string | null> {
    const [f] = await db.select({ eventId: eventOpenLinks.eventId }).from(eventOpenLinks).where(eq(eventOpenLinks.tokenHash, minter.hashOf(token))).limit(1)
    return f?.eventId ?? null
  },

  async quitar(eventId: string): Promise<void> {
    await db.delete(eventOpenLinks).where(eq(eventOpenLinks.eventId, eventId))
  },
}
