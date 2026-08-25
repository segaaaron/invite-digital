import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'

// Conexión propia de esta suite, como el resto.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/** El otro atelier: un usuario normal, sin rol de admin. */
export const OTRO = { email: 'otro-atelier-e2e@invitepremium.bo', password: 'contrasena-del-otro-1' } as const

/**
 * El hash se calcula con el hasher **de verdad**, no con una cadena pegada aquí.
 *
 * Un hash inventado no valida nunca, y la prueba pasaría por el motivo equivocado: el
 * otro atelier no entraría, y no por la multitenencia sino por no poder iniciar sesión.
 */
const hashDelOtro = (): Promise<string> => argon2Hasher.hash(OTRO.password)

export async function seedOtroAtelier(slug: string): Promise<{ userId: string; eventId: string; token: string }> {
  await deleteTenancyFixture(slug)

  const [usuario] = await sql<{ id: string }[]>`
    insert into users (email, password_hash, role)
    values (${OTRO.email}, ${await hashDelOtro()}, 'atelier')
    on conflict (email) do update set role = 'atelier'
    returning id
  `

  const [evento] = await sql<{ id: string }[]>`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id, user_id)
    values (${slug}, ${'Boda del otro atelier'}, '2027-06-12', '2027-05-30', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'), ${usuario!.id})
    returning id
  `

  const token = randomBytes(16).toString('base64url')
  await sql`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${evento!.id}, 'Invitados del otro', 4, ${createHash('sha256').update(token).digest()})
  `

  return { userId: usuario!.id, eventId: evento!.id, token }
}

export async function deleteTenancyFixture(slug: string): Promise<void> {
  await sql`delete from events where slug = ${slug}`
  await sql`delete from users where email = ${OTRO.email}`
}

export async function closeTenancyDb(): Promise<void> {
  await sql.end({ timeout: 5 })
}
