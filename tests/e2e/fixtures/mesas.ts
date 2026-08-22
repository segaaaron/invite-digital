import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Conexión propia de este archivo, no la de `checkin.ts`. Aquel la cierra en su
// `afterAll`, y como el módulo es el mismo para todo el worker, reutilizarla dejaba a
// esta suite hablando con una conexión ya terminada.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededVenue = { eventSlug: string; token: string; eventId: string }

/**
 * Siembra un evento con un grupo que ya confirmó y devuelve su token en claro. Va por
 * conexión directa porque la aplicación, a propósito, no permite recuperar un token ya
 * creado.
 */
export async function seedVenueEvent(slug: string): Promise<SeededVenue> {
  await deleteVenueEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status)
    values (${slug}, ${`Evento ${slug}`}, '2027-05-15', '2027-05-01', 'es', 'clasico', 'live')
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  const hash = createHash('sha256').update(token).digest()

  const [group] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${event!.id}, 'Familia Rojas Peña', 4, ${hash})
    returning id
  `
  await sql`insert into rsvp_responses (guest_group_id, attending) values (${group!.id}, 3)`

  return { eventSlug: slug, token, eventId: event!.id }
}

/** La mesa del grupo leída de la base: la pantalla puede mentir, la tabla no. */
export async function tableLabelOf(eventId: string, groupLabel: string): Promise<string | null> {
  const [row] = await sql<{ label: string | null }[]>`
    select t.label from guest_groups g
    left join venue_tables t on t.id = g.table_id
    where g.event_id = ${eventId} and g.label = ${groupLabel}
  `
  return row?.label ?? null
}

export async function deleteVenueEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeVenueDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
