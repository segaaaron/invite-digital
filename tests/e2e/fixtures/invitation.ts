import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededInvitation = { eventSlug: string; token: string; groupId: string }

type Options = {
  slug: string
  seats?: number
  status?: 'draft' | 'live' | 'closed'
  rsvpDeadline?: string
  revoked?: boolean
  locale?: 'es' | 'en'
}

/**
 * Siembra un evento con un grupo y devuelve su token en claro. Va por conexión directa
 * porque la aplicación, a propósito, no permite recuperar un token ya creado.
 */
export async function seedInvitation(options: Options): Promise<SeededInvitation> {
  const {
    slug,
    seats = 4,
    status = 'live',
    rsvpDeadline = '2027-05-01',
    revoked = false,
    locale = 'es',
  } = options

  await deleteEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status)
    values (${slug}, ${`Evento ${slug}`}, '2027-05-15', ${rsvpDeadline}, ${locale}, 'clasico', ${status})
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  const hash = createHash('sha256').update(token).digest()

  const [group] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash, revoked_at)
    values (${event!.id}, 'Familia Rojas Peña', ${seats}, ${hash}, ${revoked ? sql`now()` : null})
    returning id
  `

  return { eventSlug: slug, token, groupId: group!.id }
}

export async function countResponses(groupId: string): Promise<number> {
  const rows = await sql<{ count: string }[]>`select count(*)::text as count from rsvp_responses where guest_group_id = ${groupId}`
  return Number(rows[0]?.count ?? '0')
}

export async function deleteEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeInvitationDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
