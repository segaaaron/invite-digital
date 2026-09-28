import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { eventFeedback, eventNotices, events } from '@/shared/db/schema'
import type { Acompanamiento, EventoAcompanado, OpinionDeEvento } from '../application/ports'

/**
 * Lo que lee y escribe el acompañamiento diario. Las subconsultas van con los nombres escritos a
 * mano y cualificados: dentro de un `sql` Drizzle emite las columnas sin tabla.
 */
export const createDrizzleAcompanamiento = (database: DbExecutor): Acompanamiento => ({
  async eventos(hoy) {
    const filas = await database.execute<{
      id: string
      slug: string
      title: string
      event_date: string
      rsvp_deadline: string
      theme_key: string
      grupos: number
      enviados: number
      respondidos: number
      escrita: boolean
      anfitriones: string[] | null
      enviados_ya: string[] | null
    }>(sql`
      select e.id, e.slug, e.title, e.event_date::text as event_date, e.rsvp_deadline::text as rsvp_deadline, e.theme_key,
             (select count(*)::int from guest_groups g where g.event_id = e.id and g.revoked_at is null) as grupos,
             (select count(*)::int from guest_groups g where g.event_id = e.id and g.revoked_at is null and g.invitation_sent_at is not null) as enviados,
             (select count(*)::int from guest_groups g where g.event_id = e.id and g.revoked_at is null
                and exists (select 1 from rsvp_responses r where r.guest_group_id = g.id)) as respondidos,
             coalesce((select nullif(trim(ec.blocks->'schedule'->>'startsAt'), '') is not null and nullif(trim(ec.blocks->'reception'->>'place'), '') is not null
                         from event_content ec where ec.event_id = e.id), false) as escrita,
             (select array_agg(u.email::text) from event_staff s join users u on u.id = s.user_id
               where s.event_id = e.id and s.membership = 'cliente') as anfitriones,
             (select array_agg(n.kind) from event_notices n where n.event_id = e.id) as enviados_ya
        from events e
       where e.anonymized_at is null
         and e.event_date between ${hoy}::date - 372 and ${hoy}::date + 80
    `)
    return [...filas].map(
      (f): EventoAcompanado => ({
        id: f.id,
        slug: f.slug,
        title: f.title,
        eventDate: f.event_date,
        rsvpDeadline: f.rsvp_deadline,
        themeKey: f.theme_key,
        grupos: f.grupos,
        enviados: f.enviados,
        respondidos: f.respondidos,
        invitacionEscrita: f.escrita,
        anfitriones: f.anfitriones ?? [],
        yaEnviados: f.enviados_ya ?? [],
      }),
    )
  },

  async reservar(eventId, kind) {
    const filas = await database.insert(eventNotices).values({ eventId, kind }).onConflictDoNothing().returning({ kind: eventNotices.kind })
    return filas.length > 0
  },

  async liberar(eventId, kind) {
    await database.delete(eventNotices).where(and(eq(eventNotices.eventId, eventId), eq(eventNotices.kind, kind)))
  },

  async crearEncuesta(eventId, tokenHash) {
    // Una por evento. Si ya había una sin responder, se renueva su enlace; respondida, no se toca.
    await database
      .insert(eventFeedback)
      .values({ eventId, tokenHash })
      .onConflictDoUpdate({ target: eventFeedback.eventId, set: { tokenHash }, where: isNull(eventFeedback.answeredAt) })
  },

  async encuesta(tokenHash) {
    const [fila] = await database
      .select({ eventTitle: events.title, answeredAt: eventFeedback.answeredAt })
      .from(eventFeedback)
      .innerJoin(events, eq(events.id, eventFeedback.eventId))
      .where(eq(eventFeedback.tokenHash, tokenHash))
      .limit(1)
    return fila === undefined ? null : { eventTitle: fila.eventTitle, respondida: fila.answeredAt !== null }
  },

  async responder(tokenHash, r) {
    const filas = await database
      .update(eventFeedback)
      .set({ rating: r.rating, comment: r.comment, allowPublish: r.allowPublish, answeredAt: sql`now()` })
      .where(and(eq(eventFeedback.tokenHash, tokenHash), isNull(eventFeedback.answeredAt)))
      .returning({ id: eventFeedback.id })
    return filas.length > 0
  },

  async opiniones(eventIds) {
    if (eventIds.length === 0) return new Map()
    const filas = await database
      .select({ eventId: eventFeedback.eventId, rating: eventFeedback.rating, comment: eventFeedback.comment, allowPublish: eventFeedback.allowPublish, answeredAt: eventFeedback.answeredAt })
      .from(eventFeedback)
      .where(inArray(eventFeedback.eventId, [...eventIds]))
    return new Map(filas.map((f): [string, OpinionDeEvento] => [f.eventId, { rating: f.rating, comment: f.comment, allowPublish: f.allowPublish, answeredAt: f.answeredAt }]))
  },
})

export const drizzleAcompanamiento = createDrizzleAcompanamiento(db)
