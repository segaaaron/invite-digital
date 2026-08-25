import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'

// Conexión propia de este archivo, no la de `mesas.ts` ni la de `checkin.ts`: cada uno
// cierra la suya en su `afterAll`, y como el módulo es el mismo para todo el worker,
// reutilizarla dejaría a esta suite hablando con una conexión ya terminada.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

export type SeededRegistry = { eventSlug: string; eventId: string; token: string; otroToken: string }

/**
 * Siembra un evento en vivo con dos grupos invitados y devuelve sus tokens en claro. Va
 * por conexión directa porque la aplicación, a propósito, no permite recuperar un token
 * ya creado.
 */
export async function seedRegistryEvent(slug: string): Promise<SeededRegistry> {
  await deleteRegistryEvent(slug)

  const [event] = await sql<{ id: string }[]>`
    -- El dueño: desde la multitenencia, un evento sin usuario solo lo ve el admin, y
    -- estas pruebas entran como el atelier. Sin esta columna la suite entera da 404.
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    -- Plan que trae todo. Sin plan, el evento se trataría como el más barato activo
    -- (atelier), que no incluye mesa de regalos ni modo puerta, y estas pruebas
    -- chocarían con la pantalla de función no incluida en vez de con lo que miden.
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${slug}, ${`Boda ${slug}`}, '2027-05-15', '2027-05-01', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `

  const nuevoGrupo = async (label: string): Promise<string> => {
    const token = randomBytes(16).toString('base64url')
    await sql`
      insert into guest_groups (event_id, label, seats, token_hash)
      values (${event!.id}, ${label}, 4, ${createHash('sha256').update(token).digest()})
    `
    return token
  }

  return {
    eventSlug: slug,
    eventId: event!.id,
    token: await nuevoGrupo('Familia Rojas Peña'),
    otroToken: await nuevoGrupo('Familia Vargas'),
  }
}

/**
 * Revoca la invitación por conexión directa. Hacerlo por el botón del panel obligaría a
 * adivinar cuál de las dos filas de la tabla corresponde a este token, y a esperar a que
 * la lista se refresque antes de navegar.
 */
export async function revokeToken(token: string): Promise<void> {
  await sql`
    update guest_groups set revoked_at = now()
    where token_hash = ${createHash('sha256').update(token).digest()}
  `
}

/** El estado del regalo leído de la base: la pantalla puede mentir, la tabla no. */
export async function giftStateOf(
  eventId: string,
  name: string,
): Promise<{ status: string; claimedBy: string | null } | null> {
  const [row] = await sql<{ status: string; claimed_by: string | null }[]>`
    select g.status, gr.label as claimed_by
    from gifts g
    left join guest_groups gr on gr.id = g.claimed_by_group_id
    where g.event_id = ${eventId} and g.name = ${name}
  `
  return row ? { status: row.status, claimedBy: row.claimed_by } : null
}

export async function deleteRegistryEvent(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
}

export async function closeRegistryDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
