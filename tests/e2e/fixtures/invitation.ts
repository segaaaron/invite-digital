import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

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
 * Las fixtures de una invitación, **con su propia conexión**.
 *
 * Es una fábrica y no un módulo con un cliente dentro porque compartir el pool entre dos
 * specs hace que el primer `afterAll` que cierre deje a la otra escribiendo contra una
 * conexión muerta: el síntoma es «write CONNECTION_ENDED» en una prueba que no toca la
 * base. Estaba documentado desde los invitados por persona y volvió a pasar el 29 de
 * agosto al añadir la suite de las fotos del invitado.
 */
export function invitationFixtures() {
  const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

  /**
   * Siembra un evento con un grupo y devuelve su token en claro. Va por conexión directa
   * porque la aplicación, a propósito, no permite recuperar un token ya creado.
   */
  async function seedInvitation(options: Options): Promise<SeededInvitation> {
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
      -- El dueño: desde la multitenencia, un evento sin usuario solo lo ve el admin, y
      -- estas pruebas entran como el atelier. Sin esta columna la suite entera da 404.
      insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status)
      values ((select id from users where email = 'atelier@invitepremium.bo'), ${slug}, ${`Evento ${slug}`}, '2027-05-15', ${rsvpDeadline}, ${locale}, 'clasico', ${status})
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

  async function countResponses(groupId: string): Promise<number> {
    const rows = await sql<{ count: string }[]>`select count(*)::text as count from rsvp_responses where guest_group_id = ${groupId}`
    return Number(rows[0]?.count ?? '0')
  }

  async function deleteEvent(slug: string): Promise<void> {
    await sql`delete from events where slug = ${slug}`
  }

  async function closeInvitationDb(): Promise<void> {
    await sql.end({ timeout: 5 })
  }

  return { seedInvitation, countResponses, deleteEvent, closeInvitationDb }
}
