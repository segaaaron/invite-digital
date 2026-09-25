import { eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventGiftWays } from '@/shared/db/schema'
import type { FormasDeRegalarStore } from '../application/ports'
import { SIN_FORMAS } from '../domain/formas-de-regalar'

export const createDrizzleFormasDeRegalar = (database: DbExecutor): FormasDeRegalarStore => ({
  async leer(eventId) {
    // Sin la imagen: pesa y casi nadie la pide. Solo si existe.
    const [fila] = await database
      .select({
        sobres: eventGiftWays.sobres,
        sobresTexto: eventGiftWays.sobresTexto,
        transferencia: eventGiftWays.transferencia,
        banco: eventGiftWays.banco,
        titular: eventGiftWays.titular,
        cuenta: eventGiftWays.cuenta,
        nota: eventGiftWays.nota,
        tieneQr: sql<boolean>`${eventGiftWays.qrImagen} is not null`,
      })
      .from(eventGiftWays)
      .where(eq(eventGiftWays.eventId, eventId))
    return fila ?? SIN_FORMAS
  },

  async guardar(eventId, formas, qr) {
    const imagen =
      qr === 'mantener' ? {} : qr === 'quitar' ? { qrImagen: null, qrTipo: null } : { qrImagen: Buffer.from(qr.bytes), qrTipo: qr.tipo }
    await database
      .insert(eventGiftWays)
      .values({ eventId, ...formas, ...imagen, updatedAt: new Date() })
      .onConflictDoUpdate({ target: eventGiftWays.eventId, set: { ...formas, ...imagen, updatedAt: new Date() } })
  },

  async qr(eventId) {
    const [fila] = await database
      .select({ bytes: eventGiftWays.qrImagen, tipo: eventGiftWays.qrTipo })
      .from(eventGiftWays)
      .where(eq(eventGiftWays.eventId, eventId))
    return fila?.bytes && fila.tipo ? { bytes: new Uint8Array(fila.bytes), tipo: fila.tipo } : null
  },
})

export const drizzleFormasDeRegalar = createDrizzleFormasDeRegalar(db)
