import { sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { appSettings } from '@/shared/db/schema'
import type { SettingsRepository } from '../application/ports'

export const createDrizzleSettingsRepository = (database: DbExecutor): SettingsRepository => ({
  async readAll(): Promise<Record<string, string>> {
    const filas = await database.select({ key: appSettings.key, value: appSettings.value }).from(appSettings)
    return Object.fromEntries(filas.map((f) => [f.key, f.value]))
  },

  /**
   * Escribe el lote entero con `ON CONFLICT DO UPDATE`: la primera vez inserta y las
   * siguientes actualiza, sin una lectura previa que dejaría una ventana entre comprobar
   * y escribir.
   */
  async write(entries): Promise<void> {
    const filas = Object.entries(entries).map(([key, value]) => ({ key, value }))
    if (filas.length === 0) return

    await database
      .insert(appSettings)
      .values(filas)
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: sql`excluded.value`, updatedAt: sql`now()` },
      })
  },
})

export const drizzleSettingsRepository = createDrizzleSettingsRepository(db)
