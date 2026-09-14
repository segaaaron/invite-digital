import { desc, eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { appSettings, auditLog, siteSettingsVersions } from '@/shared/db/schema'
import type { SiteSettingsStore } from '../application/ports'
import { SITE_SETTINGS_KEY } from '../domain/site-settings'

export const createDrizzleSiteSettingsStore = (database: DbExecutor): SiteSettingsStore => ({
  async current() {
    const [fila] = await database.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, SITE_SETTINGS_KEY))
    const [ultima] = await database
      .select({ id: siteSettingsVersions.id })
      .from(siteSettingsVersions)
      .orderBy(desc(siteSettingsVersions.createdAt))
      .limit(1)
    return { crudo: fila?.value, ultimaVersion: ultima?.id ?? null }
  },

  /**
   * Todo dentro de una transacción, y lo primero es el candado.
   *
   * **Candado de asesoría, no `select … for update`**: el primer guardado no tiene fila que
   * bloquear —ni en `app_settings` ni en el historial— y dos primeros guardados a la vez
   * pasarían los dos. `pg_advisory_xact_lock` bloquea un nombre, exista o no la fila, y se
   * suelta solo al cerrar la transacción. Con él, comparar la versión base y escribir es
   * una sola operación para cualquier otro admin.
   */
  async commit({ base, data, partida, campos, actorUserId, actorEmail, accion }) {
    return database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${SITE_SETTINGS_KEY}))`)

      const [ultima] = await tx.select().from(siteSettingsVersions).orderBy(desc(siteSettingsVersions.createdAt)).limit(1)
      if ((ultima?.id ?? null) !== base) return { ok: false as const, ultima: ultima! }

      if (ultima === undefined) {
        // La partida se fecha un milisegundo antes para que ordene detrás de su guardado.
        await tx.insert(siteSettingsVersions).values({
          data: partida,
          campos: [],
          actorEmail: 'Valores iniciales',
          createdAt: sql`clock_timestamp() - interval '1 millisecond'`,
        })
      }
      await tx
        .insert(appSettings)
        .values({ key: SITE_SETTINGS_KEY, value: JSON.stringify(data) })
        .onConflictDoUpdate({ target: appSettings.key, set: { value: sql`excluded.value`, updatedAt: sql`now()` } })
      // `clock_timestamp()` y no el `now()` por defecto: `now()` es el inicio de la transacción,
      // anterior a la espera del candado, y el historial se ordena por esta fecha.
      await tx.insert(siteSettingsVersions).values({ data, campos: [...campos], actorEmail, createdAt: sql`clock_timestamp()` })
      await tx.insert(auditLog).values({ actorUserId, actorEmail, action: accion, subject: 'La web', detail: campos.join(', ') || null })
      return { ok: true as const }
    })
  },

  async list(limit) {
    return database.select().from(siteSettingsVersions).orderBy(desc(siteSettingsVersions.createdAt)).limit(limit)
  },

  async find(id) {
    const [fila] = await database.select().from(siteSettingsVersions).where(eq(siteSettingsVersions.id, id)).limit(1)
    return fila ?? null
  },
})

export const drizzleSiteSettingsStore = createDrizzleSiteSettingsStore(db)
