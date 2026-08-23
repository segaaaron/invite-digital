import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Conexión propia de esta suite. Compartir el pool con otra suite hace que el primer
// `afterAll` que cierre deje a la otra escribiendo contra una conexión muerta: pasó, y el
// síntoma era «write CONNECTION_ENDED» en un test que no tocaba la base.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export async function seedPeopleEvent(slug: string): Promise<{ eventId: string; token: string }> {
  await deletePeopleEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values (${slug}, ${`Boda ${slug}`}, '2027-05-15', '2027-05-01', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  await sql`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${event!.id}, 'Familia Rojas Peña', 4, ${createHash('sha256').update(token).digest()})
  `

  return { eventId: event!.id, token }
}

export async function deletePeopleEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closePeopleDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
