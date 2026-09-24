import { createHash, randomBytes } from 'node:crypto'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { escribirInvitacion } from './invitacion-minima'

// Conexión propia del fixture, **abierta al usarla y reabrible**: la importan `cliente.spec`
// y `soporte.spec`, que corren en el mismo proceso y comparten este módulo. Con una conexión
// fija, la primera suite la cerraba al terminar y la segunda escribía contra ella:
// `write CONNECTION_ENDED`.
let conexion: ReturnType<typeof postgres> | null = null
const db = () => (conexion ??= postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 }))

/** El cliente: quien celebra la boda. Entra a su evento y a ninguno más. */
export const CLIENTE = { email: 'novios-e2e@invitepremium.bo', password: 'contrasena-del-cliente-1' } as const

/** El atelier dueño del evento, que es quien le da el acceso. */
/** Quienes el anfitrión suma a su equipo en la prueba. Nacen por la pantalla, no por el fixture. */
export const EQUIPO = { planner: 'planner-equipo-e2e@invitepremium.bo', coanfitriona: 'mama-equipo-e2e@invitepremium.bo' } as const

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
  const sql = db()
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
  const [grupo] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${evento!.id}, 'Familia Vargas', 3, ${createHash('sha256').update(token).digest()})
    returning id
  `
  await sql`insert into guest_people (guest_group_id, full_name) values (${grupo!.id}, 'Rosa Vargas')`

  // Con la invitación escrita: sin ella, el cliente entra directo a «Personalizar invitación»
  // (`loQueFaltaParaInvitar`) y no al resumen de su boda, que es lo que estas pruebas miran.
  await escribirInvitacion(slug)

  return { clienteId: cliente!.id, duenoId: dueno!.id, eventId: evento!.id, token }
}

export async function deleteClienteFixture(slug: string): Promise<void> {
  const sql = db()
  await sql`delete from events where slug = ${slug}`
  await sql`delete from users where email in (${CLIENTE.email}, ${DUENO.email}, ${EQUIPO.planner}, ${EQUIPO.coanfitriona})`
}

/** Una co-anfitriona de antes: ya no se suman desde Equipo, pero las que existen siguen entrando. */
export async function sumarCoanfitriona(slug: string, email: string): Promise<void> {
  const sql = db()
  const [usuario] = await sql<{ id: string }[]>`
    insert into users (email, password_hash, role, must_change_password)
    values (${email}, ${await argon2Hasher.hash('provisional-de-prueba-1')}, 'cliente', false)
    on conflict (email) do update set role = 'cliente'
    returning id
  `
  await sql`
    insert into event_staff (event_id, user_id, membership)
    select id, ${usuario!.id}, 'coanfitrion' from events where slug = ${slug}
    on conflict (event_id, user_id) do update set membership = 'coanfitrion'
  `
}

/** Le pone una contraseña conocida y sin marca de provisional, para entrar en la prueba. */
export async function fijarClave(email: string, password: string): Promise<void> {
  const sql = db()
  await sql`update users set password_hash = ${await argon2Hasher.hash(password)}, must_change_password = false where email = ${email}`
}

export async function membresiaDe(slug: string, email: string): Promise<string | null> {
  const sql = db()
  const [fila] = await sql<{ membership: string }[]>`
    select s.membership from event_staff s join events e on e.id = s.event_id join users u on u.id = s.user_id
    where e.slug = ${slug} and u.email = ${email}`
  return fila?.membership ?? null
}

export async function closeClienteDb(): Promise<void> {
  const abierta = conexion
  conexion = null
  await abierta?.end({ timeout: 5 })
}
