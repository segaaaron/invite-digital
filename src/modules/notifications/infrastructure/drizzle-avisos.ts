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
    async vencenEl(fecha: string): Promise<{ eventId: string; que: string; ruta: string }[]> {
      const filas = (await database.execute(sql`
        select t.event_id, t.title as que, '/planner/tareas' as ruta
        from planner_tasks t join events e on e.id = t.event_id
        where t.due_date = ${fecha}::date and t.done_at is null and e.status <> 'closed'
        union all
        select i.event_id, 'pagar ' || i.concept as que, '/planner/presupuesto' as ruta
        from budget_payments p join budget_items i on i.id = p.item_id join events e on e.id = i.event_id
        where p.due_date = ${fecha}::date and p.paid_at is null and e.status <> 'closed'
      `)) as unknown as Array<{ event_id: string; que: string; ruta: string }>
      return filas.map((f) => ({ eventId: f.event_id, que: f.que, ruta: f.ruta }))
    },

    async eventosDel(fecha: string): Promise<string[]> {
      const filas = (await database.execute(sql`select id from events where event_date = ${fecha}::date and status <> 'closed'`)) as unknown as Array<{ id: string }>
      return filas.map((f) => f.id)
    },

  }
}

export const drizzleAvisos = createDrizzleAvisos(db)
