import { asc, eq, inArray, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import type { EventRepository } from '../application/ports'

const COLUMNS = {
  id: events.id,
  userId: events.userId,
  slug: events.slug,
  title: events.title,
  eventDate: events.eventDate,
  rsvpDeadline: events.rsvpDeadline,
  locale: events.locale,
  themeKey: events.themeKey,
  status: events.status,
  retentionDays: events.retentionDays,
  currency: events.currency,
  messageTemplate: events.messageTemplate,
  venue: events.venue,
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
        -- El teléfono se borra con la etiqueta: los dos identifican a la misma persona.
        set label = 'Grupo ' || numerado.posicion, phone = null
        from (
          select id, row_number() over (order by created_at) as posicion
          from guest_groups
          where event_id = ${eventId}
        ) as numerado
        where g.id = numerado.id
      `)

      // Las personas del grupo: el nombre y apellido de alguien concreto, y su
      // restricción alimentaria, que en la práctica es un dato de salud. Se conserva el
      // agregado —cuántas eran y quién era acompañante—, como con los cupos.
      await tx.execute(sql`
        update guest_people as p
        set full_name = 'Invitado ' || numerado.posicion, dietary_note = null, email = null
        from (
          select gp.id, row_number() over (order by gp.created_at) as posicion
          from guest_people gp
          join guest_groups g on g.id = gp.guest_group_id
          where g.event_id = ${eventId}
        ) as numerado
        where p.id = numerado.id
      `)

      // El nombre de quien contestó se va con el mensaje: es la persona, no el grupo. El
      // recuento —`attending`— se conserva, que es lo que hace la estadística del evento y
      // no identifica a nadie.
      await tx.execute(sql`
        update rsvp_responses
        set message = null, responder_name = null
        where guest_group_id in (select id from guest_groups where event_id = ${eventId})
      `)

      // La respuesta del atelier es texto escrito SOBRE un dato personal, y suele llevar
      // el nombre del invitado dentro. Borrar el mensaje y dejar la respuesta sería
      // anonimizar a medias. `read_at` y `featured_at` se quedan: no identifican a nadie,
      // y perderlos dejaría el libro sin saber qué se había atendido.
      await tx.execute(sql`
        update message_notes
        set reply = null, replied_at = null
        where rsvp_response_id in (
          select r.id from rsvp_responses r
          join guest_groups g on g.id = r.guest_group_id
          where g.event_id = ${eventId}
        )
      `)

      // `display_name` y `message` de las aportaciones son datos personales de terceros:
      // gente que ni siquiera está invitada, como la abuela que trae un sobre. Los
      // **importes se conservan**: la contabilidad de la pareja no es un dato personal, y
      // borrarla dejaría el fondo descuadrado para siempre sin forma de reconstruirlo.
      await tx.execute(sql`
        update fund_contributions
        set display_name = 'Anónimo', message = null
        where fund_id in (select id from gift_funds where event_id = ${eventId})
      `)

      // Los porteros son personas con nombre y teléfono, y su acceso ya no abre nada: se
      // borran. Las llegadas se quedan —son la estadística del evento— sin decir quién
      // las registró.
      await tx.execute(sql`delete from door_porters where event_id = ${eventId}`)
      await tx.execute(sql`
        update arrivals
        set recorded_by = null
        where guest_group_id in (select id from guest_groups where event_id = ${eventId})
      `)

      // El planner: las notas y el nombre del padrino identifican a gente; quién cerró una
      // tarea también. Las tareas y los importes se quedan: no son de nadie.
      await tx.execute(sql`update planner_tasks set notes = null, done_by = null where event_id = ${eventId}`)
      await tx.execute(sql`update budget_items set padrino_label = null, notes = null where event_id = ${eventId}`)
      // Proveedores: el servicio y su dinero se quedan; el contacto, las notas y el enlace, no.
      await tx.execute(sql`
        update vendors set contact_name = null, whatsapp = null, email = null, setup_notes = null, access_token_hash = null
        where event_id = ${eventId}
      `)
      // El cortejo son personas con nombre y teléfono; el papel se queda para los recuentos.
      await tx.execute(sql`update court_members set name = 'Anónimo', whatsapp = null, size = null where event_id = ${eventId}`)
      await tx.execute(sql`update run_of_show set owner = null, notes = null where event_id = ${eventId}`)
      await tx.execute(sql`update rehearsals set place = null, notes = null where event_id = ${eventId}`)

      await tx.update(events).set({ anonymizedAt: at }).where(eq(events.id, eventId))
    })
  },

  async insert(event) {
    await database.insert(events).values(event)
  },

  async remove(eventId) {
    await database.delete(events).where(eq(events.id, eventId))
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
        currency: event.currency,
        messageTemplate: event.messageTemplate,
        venue: event.venue,
      })
      .where(eq(events.id, event.id))
  },

  async listAll() {
    return database.select(COLUMNS).from(events).orderBy(asc(events.eventDate))
  },

  async listByUser(userId) {
    return database.select(COLUMNS).from(events).where(eq(events.userId, userId)).orderBy(asc(events.eventDate))
  },

  async listByIds(ids) {
    // Con la lista vacía, `inArray` genera un `in ()` que Postgres rechaza.
    if (ids.length === 0) return []
    return database.select(COLUMNS).from(events).where(inArray(events.id, [...ids])).orderBy(asc(events.eventDate))
  },

  async setOwner(eventId, userId) {
    await database.update(events).set({ userId }).where(eq(events.id, eventId))
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
