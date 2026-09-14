import { desc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { siteSettingsVersions } from '@/shared/db/schema'
import type { SiteVersionStore } from '../application/ports'

export const createDrizzleSiteVersions = (database: DbExecutor): SiteVersionStore => ({
  async add({ data, campos, actorEmail }) {
    await database.insert(siteSettingsVersions).values({ data, campos: [...campos], actorEmail })
  },
  async list(limit) {
    return database.select().from(siteSettingsVersions).orderBy(desc(siteSettingsVersions.createdAt)).limit(limit)
  },
  async find(id) {
    const [fila] = await database.select().from(siteSettingsVersions).where(eq(siteSettingsVersions.id, id)).limit(1)
    return fila ?? null
  },
})

export const drizzleSiteVersions = createDrizzleSiteVersions(db)
