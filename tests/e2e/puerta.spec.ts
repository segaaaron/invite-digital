import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'

const SLUG = 'boda-puerta-e2e'
const PUERTA = { email: 'puerta-e2e@invitepremium.bo', password: 'contrasena-de-puerta-1' } as const

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.afterAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`delete from users where email = ${PUERTA.email}`
  await sql.end({ timeout: 5 })
})

async function entrar(page: Page, quien: { email: string; password: string }): Promise<void> {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(quien.email)
  await page.getByLabel('Contraseña').fill(quien.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('el dueño da de alta a su gente de puerta, y esa gente solo ve el check-in', async ({ browser }) => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`delete from users where email = ${PUERTA.email}`
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = ${ATELIER.email}),
            ${SLUG}, 'Boda de la puerta', '2027-07-10', '2027-06-25', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
  `

  // --- El dueño la crea desde Configuración de su evento.
  const dueño = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  await dueño.goto(`/panel/eventos/${SLUG}/configuracion`)

  const tarjeta = dueño.locator('section', { has: dueño.getByRole('heading', { name: 'Personal de puerta' }) })
  await expect(tarjeta).toContainText('Todavía no hay nadie asignado')
  await tarjeta.getByLabel('Correo').fill(PUERTA.email)
  await tarjeta.getByLabel('Contraseña').fill(PUERTA.password)
  await tarjeta.getByRole('button', { name: 'Dar acceso a la puerta' }).click()
  // En la lista, no en el aviso de éxito: el correo sale en los dos sitios.
  await expect(tarjeta.getByRole('listitem').filter({ hasText: PUERTA.email })).toBeVisible()

  // --- Esa persona entra y cae en el check-in, no en el resumen.
  const puerta = await (await browser.newContext()).newPage()
  await entrar(puerta, PUERTA)
  await expect(puerta).toHaveURL(new RegExp(`/panel/eventos/${SLUG}/checkin$`))
  await expect(puerta.getByRole('heading', { name: 'Check-in de invitados' })).toBeVisible()

  // Su barra tiene una sola entrada: enseñarle el resto sería enseñarle enlaces que le
  // devuelven 404.
  await expect(puerta.getByRole('link', { name: 'Mesas' })).toHaveCount(0)
  await expect(puerta.getByRole('link', { name: 'Mesa de regalos' })).toHaveCount(0)

  // Y el resto del evento **no existe** para ella. 404, no 403.
  for (const ruta of ['', '/invitados', '/mesas', '/regalos', '/mensajes', '/configuracion', '/plan']) {
    expect((await puerta.goto(`/panel/eventos/${SLUG}${ruta}`))?.status(), `sección ${ruta || 'resumen'}`).toBe(404)
  }

  // Tampoco la administración, ni el evento de otro.
  expect((await puerta.goto('/panel/admin'))?.status()).toBe(404)
  expect((await puerta.goto('/panel/eventos/demo-boda/checkin'))?.status()).toBe(404)

  // --- El dueño le quita el acceso y deja de entrar.
  await dueño.goto(`/panel/eventos/${SLUG}/configuracion`)
  await tarjeta.getByRole('button', { name: 'Quitar' }).click()
  await expect(tarjeta).toContainText('Todavía no hay nadie asignado')

  expect((await puerta.goto(`/panel/eventos/${SLUG}/checkin`))?.status()).toBe(404)
})
