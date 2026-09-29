import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **Los avisos** (28 de septiembre): la campana del panel se entera en vivo de lo que pasa en el evento
 * —un invitado abre su invitación, confirma— y guarda qué avisos quiere cada persona en sus aparatos.
 * Quien los recibe aquí es el atelier dueño del evento. La entrega push real (FCM, Apple) no se prueba:
 * se prueba que el aparato se guarda con su sesión y que lo falso se rechaza.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const SLUG = 'avisos-e2e'
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/avisos-e2e'

test.use({ storageState: AUTH_STATE })
test.describe.configure({ mode: 'serial' })

const atelierId = async () => (await sql<{ id: string }[]>`select id from users where email = 'atelier@invitepremium.bo'`)[0]!.id
let silenciadosAntes: string[] = []

test.beforeAll(async () => {
  const id = await atelierId()
  silenciadosAntes = (await sql<{ s: string[] }[]>`select avisos_silenciados as s from users where id = ${id}`)[0]!.s
})

test.afterAll(async () => {
  const id = await atelierId()
  await sql`delete from push_subscriptions where endpoint = ${ENDPOINT}`
  await sql`update users set avisos_silenciados = ${silenciadosAntes} where id = ${id}`
  await deleteEvent(SLUG)
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('la campana se entera en vivo de que un invitado abrió su invitación y confirmó, y al abrirla quedan vistos', async ({ page, browser }) => {
  const { token, eventSlug } = await seedInvitation({ slug: SLUG, plan: 'alta-costura' })
  const id = await atelierId()
  await sql`update avisos set seen_at = now() where user_id = ${id} and seen_at is null`

  await page.goto(`/panel/eventos/${eventSlug}/invitados`)
  const campana = page.getByRole('button', { name: /^Avisos/ })
  await expect(campana).toHaveAccessibleName('Avisos')

  const invitado = await (await browser.newContext()).newPage()
  await invitado.goto(`/i/${token}`)
  // La primera apertura ya avisa, y la cuenta sube sin recargar el panel.
  await expect(campana).toHaveAccessibleName('Avisos: 1 nuevo', { timeout: 10_000 })

  await invitado.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(invitado.getByRole('status')).toContainText('Confirmación enviada')
  await expect(campana).toHaveAccessibleName('Avisos: 2 nuevos', { timeout: 10_000 })
  await invitado.context().close()

  await campana.click()
  const lista = page.locator('dialog[open]')
  await expect(lista.getByRole('link', { name: /confirmó/ }).first()).toBeVisible()
  await expect(lista.getByRole('link', { name: /abrió su invitación/ }).first()).toBeVisible()
  await expect(campana).toHaveAccessibleName('Avisos')
  expect((await sql<{ n: number }[]>`select count(*)::int as n from avisos where user_id = ${id} and seen_at is null`)[0]!.n).toBe(0)

  // Cada aviso lleva a su pantalla.
  await lista.getByRole('link', { name: /confirmó/ }).first().click()
  await expect(page).toHaveURL(new RegExp(`/panel/eventos/${eventSlug}/invitados$`))
})

test('en Mi cuenta elige qué avisos van a sus aparatos', async ({ page }) => {
  await page.goto('/panel/cuenta#avisos')
  const seccion = page.locator('#avisos')
  await expect(seccion.getByRole('heading', { name: 'Avisos' })).toBeVisible()
  // Las ventas son del admin: al atelier no se le ofrecen.
  await expect(seccion.getByText('Ventas', { exact: true })).toHaveCount(0)
  await seccion.getByRole('switch', { name: /Invitaciones abiertas/ }).uncheck()
  await seccion.getByRole('button', { name: 'Guardar' }).click()
  await expect(seccion.getByText('Guardado.')).toBeVisible()
  expect((await sql<{ s: string[] }[]>`select avisos_silenciados as s from users where id = ${await atelierId()}`)[0]!.s).toEqual(['apertura'])
})

test('el aparato se guarda con su sesión, y lo que no es una suscripción de push se rechaza', async ({ page }) => {
  await page.goto('/panel')
  const bien = await page.request.post('/panel/avisos/aparato', { data: { endpoint: ENDPOINT, keys: { p256dh: 'clave-publica', auth: 'secreto' } } })
  expect(bien.status()).toBe(204)
  expect((await sql<{ n: number }[]>`select count(*)::int as n from push_subscriptions where user_id = ${await atelierId()} and endpoint = ${ENDPOINT}`)[0]!.n).toBe(1)

  const mal = await page.request.post('/panel/avisos/aparato', { data: { endpoint: 'http://no-es-https', keys: { p256dh: 'x', auth: 'y' } } })
  expect(mal.status()).toBe(400)
})
