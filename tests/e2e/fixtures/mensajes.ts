import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Conexión propia de este archivo, como en las demás suites: cada una cierra la suya en
// su `afterAll`, y el módulo es el mismo para todo el worker.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededGuestbook = { eventSlug: string; eventId: string; token: string }

/** Siembra un evento en vivo con un grupo y devuelve su token en claro. */
export async function seedGuestbookEvent(slug: string): Promise<SeededGuestbook> {
  await deleteGuestbookEvent(slug)

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

/** El estado de la nota leído de la base: la pantalla puede mentir, la tabla no. */
export async function noteOf(
  eventId: string,
): Promise<{ readAt: Date | null; featuredAt: Date | null; reply: string | null } | null> {
  const [row] = await sql<{ read_at: Date | null; featured_at: Date | null; reply: string | null }[]>`
    select n.read_at, n.featured_at, n.reply
    from message_notes n
    join rsvp_responses r on r.id = n.rsvp_response_id
    join guest_groups g on g.id = r.guest_group_id
    where g.event_id = ${eventId}
    order by r.responded_at desc
    limit 1
  `
  return row ? { readAt: row.read_at, featuredAt: row.featured_at, reply: row.reply } : null
}

export async function deleteGuestbookEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeGuestbookDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
