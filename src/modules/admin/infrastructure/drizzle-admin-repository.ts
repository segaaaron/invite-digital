import { count, desc, eq, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { auditLog, events, guestGroups, guestPeople, orders, plans, users } from '@/shared/db/schema'
import { parseRole } from '@/modules/identity/domain/access'
import type { AdminEventRow, AdminMetrics, AdminRepository, AdminUserRow, AuditRow } from '../application/ports'

export const createDrizzleAdminRepository = (database: DbExecutor): AdminRepository => ({
  async listUsers(): Promise<AdminUserRow[]> {
    // El recuento de eventos va en una subconsulta correlacionada y no en un `join` con
    // `group by`: unir y agrupar por el usuario obliga a arrastrar todos sus eventos para
    // quedarse con el número.
    const filas = await database
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        eventos: sql<number>`(select count(*)::int from ${events} where ${events.userId} = ${users.id})`,
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
        eventos: sql<number>`(select count(*)::int from ${events} where ${events.userId} = ${users.id})`,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return fila === undefined ? null : { ...fila, role: parseRole(fila.role) }
  },

  async setRole(userId, role): Promise<void> {
    await database.update(users).set({ role }).where(eq(users.id, userId))
  },

  async deleteUser(userId): Promise<void> {
    await database.delete(users).where(eq(users.id, userId))
  },

  async listEvents(): Promise<AdminEventRow[]> {
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
        grupos: sql<number>`(select count(*)::int from ${guestGroups} where ${guestGroups.eventId} = ${events.id})`,
      })
      .from(events)
      // `leftJoin` en los dos: un evento sin dueño o sin plan tiene que salir igual en la
      // lista del admin. Son justo los que hay que arreglar.
      .leftJoin(users, eq(users.id, events.userId))
      .leftJoin(plans, eq(plans.id, events.planId))
      .orderBy(desc(events.eventDate))
  },

  async setEventPlan(eventId, planSlug): Promise<void> {
    await database
      .update(events)
      .set({ planId: sql`(select id from plans where slug = ${planSlug})` })
      .where(eq(events.id, eventId))
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

    // Los últimos doce meses **con hueco incluido**: un mes sin eventos tiene que salir
    // con cero, o la serie miente sobre la forma del negocio.
    const porMes = await database.execute<{ mes: string; total: number }>(sql`
      select to_char(m.mes, 'YYYY-MM') as mes,
             (select count(*)::int from ${events} e
               where date_trunc('month', e.event_date::date) = m.mes) as total
        from generate_series(date_trunc('month', current_date) - interval '11 months',
                             date_trunc('month', current_date),
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
