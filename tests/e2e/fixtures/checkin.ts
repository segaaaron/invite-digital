import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Conexión propia del archivo, no compartida con las otras fixtures: cada uno cierra la
// suya en su `afterAll` y compartirla dejaría al siguiente archivo sin base.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededDoor = { eventSlug: string; token: string; groupId: string; eventId: string }

/**
 * Siembra un evento con un grupo que ya confirmó, y devuelve su token en claro. Va por
 * conexión directa porque la aplicación, a propósito, no permite recuperar un token ya
 * creado.
 */
export async function seedDoorEvent(slug: string, seats = 4, attending: number | null = 3): Promise<SeededDoor> {
  await deleteEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    -- Plan que trae todo. Sin plan, el evento se trataría como el más barato activo
    -- (atelier), que no incluye mesa de regalos ni modo puerta, y estas pruebas
    -- chocarían con la pantalla de función no incluida en vez de con lo que miden.
    values (${slug}, ${`Evento ${slug}`}, '2027-05-15', '2027-05-01', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  const hash = createHash('sha256').update(token).digest()

  const [group] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${event!.id}, 'Familia Rojas Peña', ${seats}, ${hash})
    returning id
  `

  if (attending !== null) {
    await sql`insert into rsvp_responses (guest_group_id, attending) values (${group!.id}, ${attending})`
  }

  return { eventSlug: slug, token, groupId: group!.id, eventId: event!.id }
}

/** Llegadas vivas del grupo, leídas de la base: la pantalla puede mentir, la tabla no. */
export async function liveArrivals(groupId: string): Promise<{ arrivedCount: number }[]> {
  return sql<{ arrivedCount: number }[]>`
    select arrived_count as "arrivedCount" from arrivals
    where guest_group_id = ${groupId} and voided_at is null
  `
}

export async function deleteEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeCheckinDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
