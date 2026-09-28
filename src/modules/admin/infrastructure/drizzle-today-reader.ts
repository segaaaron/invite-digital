import { sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import type { TodayReader } from '../application/ports'

/**
 * Lo que «Hoy» lee aparte: las solicitudes de cambio de plan pendientes. Todo lo demás —ventas y
 * salud de los eventos— sale de las mismas lecturas que Ventas y Eventos, para que no puedan
 * contar distinto (28 de septiembre).
 */
export const createDrizzleTodayReader = (database: DbExecutor): TodayReader => ({
  async cambiosDePlan() {
    const filas = await database.execute<{ event_slug: string; event_title: string; plan_slug: string; created_at: Date | string }>(sql`
      select e.slug as event_slug, e.title as event_title, p.slug as plan_slug, r.created_at
        from plan_change_requests r
        join events e on e.id = r.event_id
        join plans p on p.id = r.requested_plan_id
       where r.status = 'pending'
    `)
    return [...filas].map((f) => ({
      eventSlug: f.event_slug,
      eventTitle: f.event_title,
      planSlug: f.plan_slug,
      createdAt: f.created_at instanceof Date ? f.created_at : new Date(f.created_at),
    }))
  },
})

export const drizzleTodayReader = createDrizzleTodayReader(db)
