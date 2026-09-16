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
  /** El plan del evento. Sin él, el evento usa el más barato, que no trae fotos de invitados. */
  plan?: string | null
  /** Las personas del grupo: con dos o más, la confirmación pasa a ser nombre por nombre. */
  people?: readonly string[]
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
      plan = null,
    } = options

    await deleteEvent(slug)

    const [event] = await sql<{ id: string }[]>`
      -- El dueño: desde la multitenencia, un evento sin usuario solo lo ve el admin, y
      -- estas pruebas entran como el atelier. Sin esta columna la suite entera da 404.
      insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
      values ((select id from users where email = 'atelier@invitepremium.bo'), ${slug}, ${`Evento ${slug}`}, '2027-05-15', ${rsvpDeadline}, ${locale}, 'clasico', ${status},
              ${plan === null ? null : sql`(select id from plans where slug = ${plan})`})
      returning id
    `

    const token = randomBytes(16).toString('base64url')
    const hash = createHash('sha256').update(token).digest()

    const [group] = await sql<{ id: string }[]>`
      insert into guest_groups (event_id, label, seats, token_hash, revoked_at)
      values (${event!.id}, 'Familia Rojas Peña', ${seats}, ${hash}, ${revoked ? sql`now()` : null})
      returning id
    `

    for (const nombre of options.people ?? []) {
      await sql`insert into guest_people (guest_group_id, full_name) values (${group!.id}, ${nombre})`
    }

    return { eventSlug: slug, token, groupId: group!.id }
  }

  async function countResponses(groupId: string): Promise<number> {
    const rows = await sql<{ count: string }[]>`select count(*)::text as count from rsvp_responses where guest_group_id = ${groupId}`
    return Number(rows[0]?.count ?? '0')
  }

  /** Cuántos asistentes quedaron registrados en la última respuesta del grupo. */
  async function attendingOf(groupId: string): Promise<number> {
    const filas = await sql<{ attending: number }[]>`
      select attending from rsvp_responses where guest_group_id = ${groupId} order by responded_at desc limit 1
    `
    return filas[0]?.attending ?? -1
  }

  /** Quién quedó marcado como asistente, para comprobar la confirmación nombre por nombre. */
  async function attendanceByPerson(groupId: string): Promise<Record<string, string | null>> {
    const filas = await sql<{ full_name: string; attending: string | null }[]>`
      select full_name, attending from guest_people where guest_group_id = ${groupId} order by created_at
    `
    return Object.fromEntries(filas.map((fila) => [fila.full_name, fila.attending]))
  }

  /** «Permitir corregir» del panel, para probar que reabre una sola vez. */
  async function reopenRsvp(groupId: string): Promise<void> {
    await sql`update guest_groups set rsvp_reopened_at = now() where id = ${groupId}`
  }

  async function deleteEvent(slug: string): Promise<void> {
    await sql`delete from events where slug = ${slug}`
  }

  async function closeInvitationDb(): Promise<void> {
    await sql.end({ timeout: 5 })
  }

  return { seedInvitation, countResponses, attendingOf, attendanceByPerson, reopenRsvp, deleteEvent, closeInvitationDb }
}
