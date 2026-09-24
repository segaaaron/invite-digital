import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { createHash, randomBytes } from 'node:crypto'
import { invitationFixtures } from './fixtures/invitation'

/**
 * Tiempo real sin sondeo: la pantalla de los novios y la de la puerta se enteran de lo que pasa
 * en otro navegador **sin recargar**. Dos contextos a la vez: uno hace, el otro mira.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
// Conexión propia: `fixtures/checkin` comparte la suya con `checkin.spec`, y cerrarla desde aquí
// deja a la otra suite escribiendo contra una conexión muerta (`CONNECTION_ENDED`).
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const PUERTA = 'en-vivo-puerta-e2e'

/** Un evento con modo puerta y una invitación confirmada, sembrado con la conexión de esta suite. */
async function sembrarPuerta(): Promise<string> {
  await sql`delete from events where slug = ${PUERTA}`
  const [evento] = await sql<{ id: string }[]>`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${PUERTA}, 'Evento en vivo', '2027-05-15', '2027-05-01', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `
  const [grupo] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${evento!.id}, 'Familia Rojas Peña', 4, ${createHash('sha256').update(randomBytes(16)).digest()})
    returning id
  `
  await sql`insert into rsvp_responses (guest_group_id, attending) values (${grupo!.id}, 3)`
  return grupo!.id
}

test.afterAll(async () => {
  await sql`delete from events where slug = ${PUERTA}`
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('el invitado confirma y los novios lo ven en su lista sin recargar', async ({ browser }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'en-vivo-rsvp-e2e', plan: 'alta-costura' })

  const novios = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  await novios.goto(`/panel/eventos/${eventSlug}/invitados`)
  await expect(novios.getByText('En vivo', { exact: true })).toBeVisible({ timeout: 10_000 })
  // Sin nada nuevo, solo el botón de actualizar a mano.
  await expect(novios.getByRole('button', { name: /novedad/ })).toHaveCount(0)

  const invitado = await (await browser.newContext()).newPage()
  await invitado.goto(`/i/${token}`)
  await invitado.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(invitado.getByRole('status')).toContainText('Confirmación enviada')

  // Llega sola, sin `reload`. No repinta: avisa, y actualiza al pulsar.
  const aviso = novios.getByRole('button', { name: '1 novedad · Ver' })
  await expect(aviso).toBeVisible({ timeout: 5_000 })
  await aviso.click()
  await expect(novios.getByRole('button', { name: /novedad/ })).toHaveCount(0)
  await expect(novios.getByRole('button', { name: 'Actualizar' })).toBeVisible()

  await deleteEvent(eventSlug)
})

test('lo que registra otra puerta aparece solo en «Ingreso al evento»', async ({ browser }) => {
  const groupId = await sembrarPuerta()
  const eventSlug = PUERTA

  const recepcion = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  await recepcion.goto(`/panel/eventos/${eventSlug}/checkin`)
  await expect(recepcion.getByText('En vivo', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(recepcion.getByRole('tab', { name: /^Dentro 0$/ })).toBeVisible()

  // Otra puerta registra la llegada (la escritura llega a la base por donde sea: el aviso sale de ahí).
  await sql`
    insert into arrivals (scan_id, guest_group_id, arrived_count, scanned_at, recorded_by)
    values (${crypto.randomUUID()}, ${groupId}, 3, now(), 'porter:e2e')
  `

  // En la puerta nadie pulsa nada: se repinta sola.
  await expect(recepcion.getByRole('tab', { name: /^Dentro [1-9]/ })).toBeVisible({ timeout: 5_000 })
})
