import { asc, eq, sql } from 'drizzle-orm'
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
  async listPendingAnonymization(now) {
    // La retención se cuenta desde la fecha del evento, no desde su alta: lo que caduca
    // es el dato del invitado una vez celebrada la fiesta.
    return database
      .select({
        id: events.id,
        slug: events.slug,
        retentionDays: events.retentionDays,
        eventDate: events.eventDate,
      })
      .from(events)
      .where(
        // La fecha viaja como texto ISO con casteo explícito: postgres.js no acepta un
        // Date como parámetro suelto dentro de un fragmento SQL.
        sql`${events.anonymizedAt} is null and (${events.eventDate}::date + ${events.retentionDays} * interval '1 day') < ${now.toISOString()}::timestamptz`,
      )
      .orderBy(asc(events.eventDate))
  },

  async anonymize(eventId, at) {
    // Una transacción: renumerar etiquetas y borrar mensajes deben caer juntos, o un
    // fallo a medias dejaría nombres reales con la marca de anonimizado puesta.
    await database.transaction(async (tx) => {
      await tx.execute(sql`
        update guest_groups as g
        set label = 'Grupo ' || numerado.posicion
        from (
          select id, row_number() over (order by created_at) as posicion
          from guest_groups
          where event_id = ${eventId}
        ) as numerado
        where g.id = numerado.id
      `)

      await tx.execute(sql`
        update rsvp_responses
        set message = null
        where guest_group_id in (select id from guest_groups where event_id = ${eventId})
      `)

      await tx.update(events).set({ anonymizedAt: at }).where(eq(events.id, eventId))
    })
  },

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
