import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { INVITACION_MINIMA } from './invitacion-minima'

// Conexión propia de esta suite. Compartir el pool con otra suite hace que el primer
// `afterAll` que cierre deje a la otra escribiendo contra una conexión muerta: pasó, y el
// síntoma era «write CONNECTION_ENDED» en un test que no tocaba la base.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export async function seedEnvioEvent(slug: string): Promise<{ eventId: string; token: string }> {
  await deleteEnvioEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    -- El dueño: desde la multitenencia, un evento sin usuario solo lo ve el admin, y
    -- estas pruebas entran como el atelier. Sin esta columna la suite entera da 404.
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${slug}, ${`Boda ${slug}`}, '2027-05-15', '2027-05-01', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `

  // Con la invitación en blanco el panel no deja repartir —el enlace abriría una página sin
  // nombres—, así que la fixture escribe lo mínimo: es lo que haría cualquier atelier antes.
  await sql`
    insert into event_content (event_id, blocks)
    values (${event!.id}, ${sql.json(INVITACION_MINIMA)})
    on conflict (event_id) do update set blocks = excluded.blocks
  `

  const token = randomBytes(16).toString('base64url')
  await sql`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${event!.id}, 'Familia Rojas Peña', 4, ${createHash('sha256').update(token).digest()})
  `

  return { eventId: event!.id, token }
}

export async function deleteEnvioEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeEnvioDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
