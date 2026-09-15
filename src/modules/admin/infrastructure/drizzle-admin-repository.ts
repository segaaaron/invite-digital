import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { auditLog, events, guestGroups, guestPeople, orders, plans, planTranslations, rsvpResponses, users } from '@/shared/db/schema'
import { parseRole } from '@/modules/identity'
import type { AdminEventRow, AdminMetrics, AdminRepository, AdminUserRow, AuditRow } from '../application/ports'

export const createDrizzleAdminRepository = (database: DbExecutor): AdminRepository => ({
  async listUsers(): Promise<AdminUserRow[]> {
    // El recuento va en una subconsulta correlacionada y no en un `join` con `group by`:
    // unir y agrupar por el usuario obliga a arrastrar todos sus eventos para quedarse
    // con el número.
    //
    // **Los nombres van cualificados a mano y sin interpolar.** Drizzle emite
    // `${users.id}` como `"id"` a secas, y dentro de esta subconsulta `"id"` es
    // `events.id`: la condición se convertía en `events.user_id = events.id` y contaba
    // cero para todo el mundo, sin un solo error. Lo cazó la pantalla, no el typecheck.
    const filas = await database
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        eventos: sql<number>`(select count(*)::int from events where events.user_id = users.id)`,
        planSlug: sql<string | null>`(select plans.slug from plans where plans.id = users.plan_id)`,
      })
      .from(users)
      .orderBy(users.createdAt)

    return filas.map((fila) => ({ ...fila, role: parseRole(fila.role) }))
  },

  async countAdmins(): Promise<number> {
    const [fila] = await database.select({ total: count() }).from(users).where(eq(users.role, 'admin'))
    return fila?.total ?? 0
  },

  async findUserById(id): Promise<AdminUserRow | null> {
    const [fila] = await database
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        eventos: sql<number>`(select count(*)::int from events where events.user_id = users.id)`,
        planSlug: sql<string | null>`(select plans.slug from plans where plans.id = users.plan_id)`,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return fila === undefined ? null : { ...fila, role: parseRole(fila.role) }
  },

  async setUserPlan(userId, planSlug): Promise<boolean> {
    const filas = await database
      .update(users)
      .set({ planId: planSlug === null ? null : sql`(select id from plans where slug = ${planSlug})` })
      .where(eq(users.id, userId))
      .returning({ id: users.id })
    return filas.length > 0
  },

  async setRole(userId, role): Promise<void> {
    await database.update(users).set({ role }).where(eq(users.id, userId))
  },

  async deleteUser(userId): Promise<void> {
    await database.delete(users).where(eq(users.id, userId))
  },

  async listEvents(): Promise<AdminEventRow[]> {
    // **Una pasada agregada**, no tres subconsultas por evento: cada una recorría los grupos de
    // su evento, así que el coste crecía con eventos × grupos. Medido con 400 eventos y 12.000
    // grupos: 37,8 ms → 5 ms. Un grupo con varias respuestas cuenta una vez (`distinct`), y los
    // revocados no cuentan.
    const respondidos = database.selectDistinct({ guestGroupId: rsvpResponses.guestGroupId }).from(rsvpResponses).as('respondidos')
    const conteos = database
      .select({
        eventId: guestGroups.eventId,
        grupos: sql<number>`count(*)::int`.as('grupos'),
        enviados: sql<number>`(count(*) filter (where ${guestGroups.invitationSentAt} is not null))::int`.as('enviados'),
        respondidos: sql<number>`count(${respondidos.guestGroupId})::int`.as('respondidos'),
      })
      .from(guestGroups)
      .leftJoin(respondidos, eq(respondidos.guestGroupId, guestGroups.id))
      .where(isNull(guestGroups.revokedAt))
      .groupBy(guestGroups.eventId)
      .as('conteos')

    return database
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        eventDate: events.eventDate,
        status: events.status,
        ownerId: events.userId,
        ownerEmail: users.email,
        planSlug: plans.slug,
        themeKey: events.themeKey,
        grupos: sql<number>`coalesce(${conteos.grupos}, 0)`,
        enviados: sql<number>`coalesce(${conteos.enviados}, 0)`,
        respondidos: sql<number>`coalesce(${conteos.respondidos}, 0)`,
      })
      .from(events)
      // `leftJoin` en los dos: un evento sin dueño o sin plan tiene que salir igual en la
      // lista del admin. Son justo los que hay que arreglar. Y en los conteos: un evento sin
      // grupos también sale, con cero.
      .leftJoin(users, eq(users.id, events.userId))
      .leftJoin(plans, eq(plans.id, events.planId))
      .leftJoin(conteos, eq(conteos.eventId, events.id))
      .orderBy(desc(events.eventDate))
  },

  async setEventPlan(eventId, planSlug): Promise<void> {
    await database
      .update(events)
      // Los días en línea son del plan, y cambian con él en la misma escritura.
      .set({
        planId: sql`(select id from plans where slug = ${planSlug})`,
        retentionDays: sql`coalesce((select online_days from plans where slug = ${planSlug}) + (select coalesce(sum(amount), 0) from event_addons where event_addons.event_id = ${eventId} and effect = 'mas_dias'), ${events.retentionDays})`,
      })
      .where(eq(events.id, eventId))
  },

  async listPlanOptions() {
    const filas = await database
      .select({ slug: plans.slug, nombre: planTranslations.name, priceCents: plans.priceCents })
      .from(plans)
      .leftJoin(planTranslations, and(eq(planTranslations.planId, plans.id), eq(planTranslations.locale, 'es')))
      .orderBy(plans.sortOrder)
    return filas.map((f) => ({ slug: f.slug, nombre: f.nombre ?? f.slug, priceCents: f.priceCents }))
  },

  async listPlanSlugs(): Promise<string[]> {
    const filas = await database.select({ slug: plans.slug }).from(plans).orderBy(plans.sortOrder)
    return filas.map((f) => f.slug)
  },

  async metrics(): Promise<AdminMetrics> {
    const [totales] = await database.execute<{
      eventos: number
      usuarios: number
      invitados: number
      pedidos: number
    }>(sql`
      select (select count(*)::int from ${events})                             as eventos,
             (select count(*)::int from ${users})                              as usuarios,
             (select count(*)::int from ${guestPeople})                        as invitados,
             (select count(*)::int from ${orders} where status = 'approved')   as pedidos
    `)

    // Los **doce meses que vienen**, no los doce pasados: en este negocio los eventos
    // están siempre por delante. La primera versión miraba hacia atrás y enseñaba doce
    // ceros con dos bodas en la base, que es una gráfica que miente por omisión.
    //
    // Con los huecos incluidos: un mes sin bodas sale con cero, o la serie miente sobre
    // la forma del año.
    const porMes = await database.execute<{ mes: string; total: number }>(sql`
      select to_char(m.mes, 'YYYY-MM') as mes,
             (select count(*)::int from ${events} e
               where date_trunc('month', e.event_date::date) = m.mes) as total
        from generate_series(date_trunc('month', current_date),
                             date_trunc('month', current_date) + interval '11 months',
                             interval '1 month') as m(mes)
       order by m.mes
    `)

    const porPlan = await database.execute<{ plan: string; total: number }>(sql`
      select coalesce(p.slug, 'sin plan') as plan, count(*)::int as total
        from ${events} e
        left join ${plans} p on p.id = e.plan_id
       group by 1
       order by 2 desc
    `)

    return {
      eventos: totales?.eventos ?? 0,
      usuarios: totales?.usuarios ?? 0,
      invitados: totales?.invitados ?? 0,
      pedidosAprobados: totales?.pedidos ?? 0,
      porMes: [...porMes],
      porPlan: [...porPlan],
    }
  },

  async listAudit(limit): Promise<AuditRow[]> {
    return database
      .select({
        id: auditLog.id,
        actorEmail: auditLog.actorEmail,
        action: auditLog.action,
        subject: auditLog.subject,
        detail: auditLog.detail,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
  },

  async record(entry): Promise<void> {
    await database.insert(auditLog).values({
      actorUserId: entry.actorUserId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      subject: entry.subject ?? null,
      detail: entry.detail ?? null,
    })
  },
})

export const drizzleAdminRepository = createDrizzleAdminRepository(db)
