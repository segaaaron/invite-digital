import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'

// Conexión propia de esta suite, como el resto: compartir el pool entre dos specs deja a
// la segunda escribiendo contra una conexión que la primera ya cerró.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/** El cliente: quien celebra la boda. Entra a su evento y a ninguno más. */
export const CLIENTE = { email: 'novios-e2e@invitepremium.bo', password: 'contrasena-del-cliente-1' } as const

/** El atelier dueño del evento, que es quien le da el acceso. */
export const DUENO = { email: 'atelier-cliente-e2e@invitepremium.bo', password: 'contrasena-del-dueno-1' } as const

export type ClienteFixture = {
  readonly clienteId: string
  readonly duenoId: string
  readonly eventId: string
  readonly token: string
}

/**
 * Siembra una boda con su dueño y su cliente.
 *
 * El cliente **no** es el dueño del evento: entra por la pertenencia de `event_staff` con
 * `membership = 'cliente'`, que es justo lo que la prueba tiene que ejercitar. Un fixture
 * que le pusiera `events.user_id` probaría otra cosa y pasaría por el motivo equivocado.
 *
 * El plan es `alta-costura` porque un evento sin plan cae al más barato, que no trae mesa
 * de regalos ni modo puerta: la misma trampa que ya documentan los demás fixtures.
 */
export async function seedCliente(slug: string): Promise<ClienteFixture> {
  await deleteClienteFixture(slug)

  const [dueno] = await sql<{ id: string }[]>`
    -- Con la marca apagada: esta contraseña la pone el fixture, no ha viajado por correo.
    -- Con ella puesta, entrar lleva a cambiarla y la prueba no llega a la boda.
    insert into users (email, password_hash, role, must_change_password)
    values (${DUENO.email}, ${await argon2Hasher.hash(DUENO.password)}, 'atelier', false)
    on conflict (email) do update set role = 'atelier', must_change_password = false
    returning id
  `

  const [cliente] = await sql<{ id: string }[]>`
    insert into users (email, password_hash, role, must_change_password)
    values (${CLIENTE.email}, ${await argon2Hasher.hash(CLIENTE.password)}, 'cliente', false)
    on conflict (email) do update set role = 'cliente', must_change_password = false
    returning id
  `

  const [evento] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id, user_id)
    values (${slug}, ${'Boda con acceso de cliente'}, '2027-08-14', '2027-07-30', 'es', 'boda', 'live',
            (select id from plans where slug = 'alta-costura'), ${dueno!.id})
    returning id
  `

  await sql`
    insert into event_staff (event_id, user_id, membership)
    values (${evento!.id}, ${cliente!.id}, 'cliente')
    on conflict (event_id, user_id) do update set membership = 'cliente'
  `

  const token = randomBytes(16).toString('base64url')
  await sql`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${evento!.id}, 'Familia Vargas', 3, ${createHash('sha256').update(token).digest()})
  `

  return { clienteId: cliente!.id, duenoId: dueno!.id, eventId: evento!.id, token }
}

export async function deleteClienteFixture(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
  await sql`delete from users where email in (${CLIENTE.email}, ${DUENO.email})`
}

export async function closeClienteDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
