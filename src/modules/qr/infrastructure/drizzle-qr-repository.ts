import { desc, eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { qrCodes } from '@/shared/db/schema'
import type { QrRepository, QrRow } from '../application/ports'

const COLUMNS = {
  id: qrCodes.id,
  userId: qrCodes.userId,
  eventId: qrCodes.eventId,
  label: qrCodes.label,
  kind: qrCodes.kind,
  target: qrCodes.target,
  active: qrCodes.active,
  scanCount: qrCodes.scanCount,
  lastScanAt: qrCodes.lastScanAt,
  createdAt: qrCodes.createdAt,
} as const

export const createDrizzleQrRepository = (database: DbExecutor): QrRepository => ({
  async insert(row): Promise<void> {
    await database.insert(qrCodes).values(row)
  },

  async listByEvent(eventId): Promise<QrRow[]> {
    return database.select(COLUMNS).from(qrCodes).where(eq(qrCodes.eventId, eventId)).orderBy(desc(qrCodes.createdAt))
  },

  async findById(id): Promise<QrRow | null> {
    const [fila] = await database.select(COLUMNS).from(qrCodes).where(eq(qrCodes.id, id)).limit(1)
    return fila ?? null
  },

  async update(id, patch): Promise<void> {
    // Solo las claves presentes: apagar un código no puede borrar su etiqueta.
    const set: Record<string, string | boolean> = {}
    if (patch.label !== undefined) set.label = patch.label
    if (patch.target !== undefined) set.target = patch.target
    if (patch.active !== undefined) set.active = patch.active
    if (Object.keys(set).length === 0) return

    await database.update(qrCodes).set(set).where(eq(qrCodes.id, id))
  },

  async remove(id): Promise<void> {
    await database.delete(qrCodes).where(eq(qrCodes.id, id))
  },

  /**
   * `scan_count = scan_count + 1` en la propia base, no leyendo y volviendo a escribir:
   * dos invitados escaneando el mismo cartel a la vez perderían una cuenta con la versión
   * ingenua, y eso no aparece jamás en desarrollo.
   */
  async countScan(id, at): Promise<void> {
    await database
      .update(qrCodes)
      .set({ scanCount: sql`${qrCodes.scanCount} + 1`, lastScanAt: at })
      .where(eq(qrCodes.id, id))
  },
})

export const drizzleQrRepository = createDrizzleQrRepository(db)
