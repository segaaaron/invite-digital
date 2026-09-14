import { sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import type { TodayReader } from '../application/ports'

/**
 * La foto de «Hoy», en seis consultas pequeñas que corren a la vez.
 *
 * **Los nombres van escritos a mano y cualificados**, sin interpolar columnas de Drizzle:
 * dentro de una subconsulta correlacionada Drizzle emite `"id"` a secas, y eso ya contó
 * cero para todo el mundo una vez (`listUsers`).
 */
export const createDrizzleTodayReader = (database: DbExecutor): TodayReader => ({
  async snapshot(hoy, horizonteDias) {
    const [porRevisar, sinPago, consultas, cambios, eventos, accesos] = await Promise.all([
      // Desde el **último comprobante**, no desde el pedido: lo que espera es la subida.
      database.execute<{ ref: string; customer_name: string; desde: Date }>(sql`
        select o.public_ref as ref, o.customer_name,
               coalesce((select max(p.uploaded_at) from order_proofs p where p.order_id = o.id), o.created_at) as desde
          from orders o
         where o.status = 'proof_submitted'
      `),
      database.execute<{ ref: string; customer_name: string; created_at: Date }>(sql`
        select o.public_ref as ref, o.customer_name, o.created_at
          from orders o
         where o.status = 'pending_payment'
      `),
      database.execute<{ id: string; name: string; created_at: Date; event_date: string | null }>(sql`
        select c.id, c.name, c.created_at, c.event_date::text as event_date
          from consultation_requests c
         where c.status = 'new'
      `),
      database.execute<{ event_slug: string; event_title: string; plan_slug: string; created_at: Date }>(sql`
        select e.slug as event_slug, e.title as event_title, p.slug as plan_slug, r.created_at
          from plan_change_requests r
          join events e on e.id = r.event_id
          join plans p on p.id = r.requested_plan_id
         where r.status = 'pending'
      `),
      // Los grupos revocados no cuentan: su enlace ya no sirve. Respondido es tener al
      // menos una respuesta, sea sí o no.
      database.execute<{ slug: string; title: string; event_date: string; status: string; grupos: number; respondidos: number }>(sql`
        select e.slug, e.title, e.event_date::text as event_date, e.status,
               (select count(*)::int from guest_groups g
                 where g.event_id = e.id and g.revoked_at is null) as grupos,
               (select count(*)::int from guest_groups g
                 where g.event_id = e.id and g.revoked_at is null
                   and exists (select 1 from rsvp_responses r where r.guest_group_id = g.id)) as respondidos
          from events e
         where e.anonymized_at is null
           and e.event_date >= ${hoy}::date
           and e.event_date <= ${hoy}::date + ${horizonteDias}::int
      `),
      database.execute<{ email: string; created_at: Date; event_slug: string | null; event_title: string | null }>(sql`
        select u.email::text as email, u.created_at,
               (select e.slug from event_staff s join events e on e.id = s.event_id
                 where s.user_id = u.id and s.membership = 'cliente'
                 order by e.event_date limit 1) as event_slug,
               (select e.title from event_staff s join events e on e.id = s.event_id
                 where s.user_id = u.id and s.membership = 'cliente'
                 order by e.event_date limit 1) as event_title
          from users u
         where u.role = 'cliente' and u.must_change_password
      `),
    ])

    // `execute` devuelve las fechas como las da el driver; se normalizan aquí para que el
    // dominio reciba siempre `Date`.
    const fecha = (valor: Date | string) => (valor instanceof Date ? valor : new Date(valor))

    return {
      pedidosPorRevisar: [...porRevisar].map((f) => ({ ref: f.ref, customerName: f.customer_name, createdAt: fecha(f.desde) })),
      pedidosSinPago: [...sinPago].map((f) => ({ ref: f.ref, customerName: f.customer_name, createdAt: fecha(f.created_at) })),
      consultasNuevas: [...consultas].map((f) => ({ id: f.id, name: f.name, createdAt: fecha(f.created_at), eventDate: f.event_date })),
      cambiosDePlan: [...cambios].map((f) => ({
        eventSlug: f.event_slug,
        eventTitle: f.event_title,
        planSlug: f.plan_slug,
        createdAt: fecha(f.created_at),
      })),
      eventos: [...eventos].map((f) => ({
        slug: f.slug,
        title: f.title,
        eventDate: f.event_date,
        status: f.status,
        grupos: f.grupos,
        respondidos: f.respondidos,
      })),
      accesosSinEstrenar: [...accesos].map((f) => ({
        email: f.email,
        createdAt: fecha(f.created_at),
        eventSlug: f.event_slug,
        eventTitle: f.event_title,
      })),
    }
  },
})

export const drizzleTodayReader = createDrizzleTodayReader(db)
