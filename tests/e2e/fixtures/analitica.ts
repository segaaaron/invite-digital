import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededAnalytics = { eventSlug: string; eventId: string; token: string }

/** Un evento en vivo con un grupo, para abrir su invitación y contar la visita. */
export async function seedAnalyticsEvent(slug: string): Promise<SeededAnalytics> {
  await deleteAnalyticsEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    -- El dueño: desde la multitenencia, un evento sin usuario solo lo ve el admin, y
    -- estas pruebas entran como el atelier. Sin esta columna la suite entera da 404.
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status)
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${slug}, ${`Boda ${slug}`}, '2027-05-15', '2027-05-01', 'es', 'clasico', 'live')
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  await sql`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${event!.id}, 'Familia Rojas Peña', 4, ${createHash('sha256').update(token).digest()})
  `

  return { eventSlug: slug, eventId: event!.id, token }
}

/** Lo que la tabla guarda de verdad: la pantalla puede mentir, la fila no. */
export async function viewsOf(eventId: string): Promise<{ device: string; source: string }[]> {
  return sql<{ device: string; source: string }[]>`
    select device, source from invitation_views where event_id = ${eventId} order by viewed_at
  `
}

export async function deleteAnalyticsEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeAnalyticsDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
