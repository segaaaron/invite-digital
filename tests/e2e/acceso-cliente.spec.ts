import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN, ADMIN_AUTH_STATE } from './fixtures/atelier'

/**
 * El admin da acceso al cliente desde la ficha de un evento que creó él, sin cliente todavía (7 de
 * octubre: en producción salía «Ese evento ya no existe» al pulsar «Dar acceso al cliente»).
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const SLUG = 'acceso-cliente-e2e'
const CORREO = 'cliente-acceso-e2e@invitepremium.bo'

test.use({ storageState: ADMIN_AUTH_STATE })

test.beforeAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`delete from users where email = ${CORREO}`
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = ${ADMIN.email}), ${SLUG}, 'Noche de chicas', '2026-10-17', '2026-10-12', 'es', 'cumple-femme', 'live', (select id from plans where slug = 'imperial'))`
})

test.afterAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`delete from users where email = ${CORREO}`
  await sql.end({ timeout: 5 })
})

test('el admin da acceso al cliente desde la ficha de un evento sin cliente', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/configuracion`)
  await page.getByLabel('Correo del cliente').fill(CORREO)
  await page.getByRole('button', { name: 'Dar acceso al cliente' }).click()
  await expect(page.getByText(/ya tiene acceso/)).toBeVisible()
  const [m] = await sql<{ n: number }[]>`select count(*)::int as n from event_staff s join users u on u.id = s.user_id join events e on e.id = s.event_id where e.slug = ${SLUG} and u.email = ${CORREO} and s.membership = 'cliente'`
  expect(m!.n).toBe(1)
})
