import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { avisos, pushSubscriptions, users } from '@/shared/db/schema'
import type { AparatoPush, AvisosStore } from '../application/avisos'

export type AvisoGuardado = {
  readonly id: string
  readonly kind: string
  readonly title: string
  readonly body: string
  readonly href: string
  readonly createdAt: Date
  readonly visto: boolean
}

/** El almacén de los avisos: lo que usa `avisarDelEvento` y lo que lee la campana. */
export const createDrizzleAvisos = (database: DbExecutor) => {
  const store: AvisosStore = {
    async delEvento(eventId) {
      // Nombres escritos a mano y cualificados: dentro de un `sql` interpolado Drizzle los emite sin tabla.
      const filas = (await database.execute(sql`
        select e.title, e.slug, o.id as owner_id, o.role as owner_role,
               coalesce(json_agg(json_build_object('userId', s.user_id, 'role', u.role, 'membership', s.membership))
                        filter (where s.user_id is not null), '[]') as equipo
        from events e
        left join users o on o.id = e.user_id
        left join event_staff s on s.event_id = e.id
        left join users u on u.id = s.user_id
        where e.id = ${eventId}
        group by e.id, o.id
      `)) as unknown as Array<{ title: string; slug: string; owner_id: string | null; owner_role: string | null; equipo: { userId: string; role: string; membership: string }[] }>
      const f = filas[0]
      if (f === undefined) return null
      return { titulo: f.title, slug: f.slug, dueno: f.owner_id === null ? null : { userId: f.owner_id, role: f.owner_role ?? 'atelier' }, equipo: f.equipo }
    },

    async admins() {
      const filas = await database.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))
      return filas.map((f) => f.id)
    },

    async crear(filas) {
      if (filas.length === 0) return
      await database.insert(avisos).values(filas.map((f) => ({ userId: f.userId, eventId: f.eventId, kind: f.aviso.kind, title: f.aviso.title, body: f.aviso.body, href: f.aviso.href })))
    },

    async aparatosDe(userIds): Promise<AparatoPush[]> {
      if (userIds.length === 0) return []
      const filas = await database
        .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth, silenciados: users.avisosSilenciados })
        .from(pushSubscriptions)
        .innerJoin(users, eq(users.id, pushSubscriptions.userId))
        .where(inArray(pushSubscriptions.userId, [...userIds]))
      return filas
    },

    async olvidarAparato(id) {
      await database.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))
    },

    async aparatoUsado(id) {
      await database.update(pushSubscriptions).set({ lastUsedAt: sql`now()` }).where(eq(pushSubscriptions.id, id))
    },

    /** Si ese aviso de agenda ya salió hoy para el evento: el mantenimiento puede correr dos veces. */
    async yaAvisado(eventId, titulo) {
      const [fila] = await database
        .select({ n: sql<number>`count(*)::int` })
        .from(avisos)
        .where(and(eq(avisos.eventId, eventId), eq(avisos.kind, 'agenda'), eq(avisos.title, titulo), sql`${avisos.createdAt} > now() - interval '20 hours'`))
      return (fila?.n ?? 0) > 0
    },
  }

  return {
    ...store,

    /** Los últimos avisos de la persona, del más nuevo al más viejo. */
    async listar(userId: string, limite: number): Promise<AvisoGuardado[]> {
      const filas = await database
        .select({ id: avisos.id, kind: avisos.kind, title: avisos.title, body: avisos.body, href: avisos.href, createdAt: avisos.createdAt, seenAt: avisos.seenAt })
        .from(avisos)
        .where(eq(avisos.userId, userId))
        .orderBy(desc(avisos.createdAt))
        .limit(limite)
      return filas.map(({ seenAt, ...f }) => ({ ...f, visto: seenAt !== null }))
    },

    async sinVer(userId: string): Promise<number> {
      const [fila] = await database.select({ n: sql<number>`count(*)::int` }).from(avisos).where(and(eq(avisos.userId, userId), isNull(avisos.seenAt)))
      return fila?.n ?? 0
    },

    async marcarVistos(userId: string): Promise<void> {
      await database.update(avisos).set({ seenAt: sql`now()` }).where(and(eq(avisos.userId, userId), isNull(avisos.seenAt)))
    },

    /**
     * Guarda el aparato. El `endpoint` es único: si ya existía (otra cuenta en el mismo navegador, o el
     * mismo que se re-suscribe) pasa a esta persona con sus claves nuevas.
     */
    async suscribir(userId: string, sub: { endpoint: string; p256dh: string; auth: string }, device: string | null): Promise<void> {
      await database
        .insert(pushSubscriptions)
        .values({ userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, device })
        .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: sub.p256dh, auth: sub.auth, device } })
    },

    /** Solo borra el aparato si es de esta persona: un `endpoint` ajeno no se toca. */
    async desuscribir(userId: string, endpoint: string): Promise<void> {
      await database.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    },

    async cuantosAparatos(userId: string): Promise<number> {
      const [fila] = await database.select({ n: sql<number>`count(*)::int` }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
      return fila?.n ?? 0
    },

    async silenciados(userId: string): Promise<string[]> {
      const [fila] = await database.select({ s: users.avisosSilenciados }).from(users).where(eq(users.id, userId))
      return fila?.s ?? []
    },

    async silenciar(userId: string, tipos: readonly string[]): Promise<void> {
      await database.update(users).set({ avisosSilenciados: [...tipos] }).where(eq(users.id, userId))
    },

    /**
     * Lo que vence en `fecha` (ISO, día de Bolivia): tareas sin hacer, pagos sin pagar y los eventos de
     * ese día. Solo de eventos vivos o en borrador. `ruta` es la pantalla del evento donde se atiende.
     */
    /**
     * Los eventos con **algo que avisar** ese día (QA 9 oct): su día a 0/1/7/30, el cierre de confirmaciones,
     * tareas y pagos de ayer, hoy o mañana sin hacer, y citas o ensayos de hoy o mañana. Recorrer todos los
     * eventos futuros con su agenda entera eran miles de consultas cada mañana; esto elige antes en la base.
     * Qué se dice de cada uno lo sigue decidiendo `avisosDeLaAgenda`.
     */
    async eventosConAvisos(hoy: string): Promise<string[]> {
      const d = (n: number) => sql`(${hoy}::date + ${n}::integer)`
      const filas = (await database.execute(sql`
        select e.id from events e
        where e.status <> 'closed' and e.event_date >= ${hoy}::date and (
          e.event_date in (${d(0)}, ${d(1)}, ${d(7)}, ${d(30)})
          or e.rsvp_deadline in (${d(0)}, ${d(1)})
          or exists (select 1 from planner_tasks t where t.event_id = e.id and t.done_at is null and t.due_date between ${d(-1)} and ${d(1)})
          or exists (select 1 from budget_payments p join budget_items i on i.id = p.item_id
                     where i.event_id = e.id and p.paid_at is null and p.due_date between ${d(-1)} and ${d(1)})
          or exists (select 1 from event_appointments a where a.event_id = e.id and left(a.starts_at, 10)::date between ${d(0)} and ${d(1)})
          or exists (select 1 from rehearsals r where r.event_id = e.id and (r.date at time zone 'America/La_Paz')::date between ${d(0)} and ${d(1)})
        )`)) as unknown as Array<{ id: string }>
      return filas.map((f) => f.id)
    },

  }
}

export const drizzleAvisos = createDrizzleAvisos(db)
