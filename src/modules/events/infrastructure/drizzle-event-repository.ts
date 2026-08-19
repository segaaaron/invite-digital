import { asc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import type { EventRepository } from '../application/ports'

const COLUMNS = {
  id: events.id,
  slug: events.slug,
  title: events.title,
  eventDate: events.eventDate,
  rsvpDeadline: events.rsvpDeadline,
  locale: events.locale,
  themeKey: events.themeKey,
  status: events.status,
  retentionDays: events.retentionDays,
} as const

export const createDrizzleEventRepository = (database: DbExecutor): EventRepository => ({
  async insert(event) {
    await database.insert(events).values(event)
  },

  async update(event) {
    await database
      .update(events)
      .set({
        slug: event.slug,
        title: event.title,
        eventDate: event.eventDate,
        rsvpDeadline: event.rsvpDeadline,
        locale: event.locale,
        themeKey: event.themeKey,
        status: event.status,
        retentionDays: event.retentionDays,
      })
      .where(eq(events.id, event.id))
  },

  async listAll() {
    return database.select(COLUMNS).from(events).orderBy(asc(events.eventDate))
  },

  async findBySlug(slug) {
    const [row] = await database.select(COLUMNS).from(events).where(eq(events.slug, slug)).limit(1)
    return row ?? null
  },

  async findById(id) {
    const [row] = await database.select(COLUMNS).from(events).where(eq(events.id, id)).limit(1)
    return row ?? null
  },
})

export const drizzleEventRepository = createDrizzleEventRepository(db)
