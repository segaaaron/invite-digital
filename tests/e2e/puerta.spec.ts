import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { ADMIN_AUTH_STATE, ATELIER } from './fixtures/atelier'

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

test('el personal de puerta con cuenta solo ve el check-in, y el admin se lo quita', async ({ browser }) => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`delete from users where email = ${PUERTA.email}`
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = ${ATELIER.email}),
            ${SLUG}, 'Boda de la puerta', '2027-07-10', '2027-06-25', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
  `

  // --- La cuenta de puerta ya existe: desde que la recepción se suma con enlace y PIN, el
  // panel no crea cuentas de puerta nuevas, pero las que había siguen entrando y se quitan.
  await sql`
    insert into users (email, password_hash, role, must_change_password)
    values (${PUERTA.email}, ${await argon2Hasher.hash(PUERTA.password)}, 'puerta', false)
  `
  await sql`
    insert into event_staff (event_id, user_id, membership)
    values ((select id from events where slug = ${SLUG}), (select id from users where email = ${PUERTA.email}), 'puerta')
  `

  const gestor = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
  await gestor.goto(`/panel/eventos/${SLUG}/configuracion`)
  const tarjeta = gestor.locator('section', { has: gestor.getByRole('heading', { name: 'Personal de puerta' }) })
  await expect(tarjeta.getByRole('listitem').filter({ hasText: PUERTA.email })).toBeVisible()
  // Ya no hay alta de cuentas de puerta: la recepción se suma con enlace y PIN.
  await expect(tarjeta.getByRole('button', { name: 'Dar acceso a la puerta' })).toHaveCount(0)

  // --- Esa persona entra y cae en el check-in, no en el resumen.
  const puerta = await (await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': '10.99.0.7' } })).newPage()
  await entrar(puerta, PUERTA)
  await expect(puerta).toHaveURL(new RegExp(`/panel/eventos/${SLUG}/checkin$`))
  await expect(puerta.getByRole('heading', { name: 'Ingreso al evento' })).toBeVisible()

  // Su barra tiene una sola entrada: enseñarle el resto sería enseñarle enlaces que le
  // devuelven 404.
  await expect(puerta.getByRole('link', { name: 'Mesas' })).toHaveCount(0)
  await expect(puerta.getByRole('link', { name: 'Mesa de regalos' })).toHaveCount(0)

  // Y el resto del evento **no existe** para ella. 404, no 403.
  for (const ruta of ['', '/invitados', '/mesas', '/regalos', '/mensajes', '/configuracion', '/plan', '/planner/tareas', '/planner/presupuesto']) {
    expect((await puerta.goto(`/panel/eventos/${SLUG}${ruta}`))?.status(), `sección ${ruta || 'resumen'}`).toBe(404)
  }

  // Tampoco la administración, ni el evento de otro.
  expect((await puerta.goto('/panel/admin'))?.status()).toBe(404)
  expect((await puerta.goto('/panel/eventos/demo-boda/checkin'))?.status()).toBe(404)

  // --- El admin le quita el acceso y deja de entrar.
  await gestor.goto(`/panel/eventos/${SLUG}/configuracion`)
  await tarjeta.getByRole('button', { name: 'Quitar' }).click()
  // Sin nadie, la tarjeta desaparece: no queda nada que gestionar ahí.
  await expect(gestor.getByRole('heading', { name: 'Personal de puerta' })).toHaveCount(0)

  expect((await puerta.goto(`/panel/eventos/${SLUG}/checkin`))?.status()).toBe(404)
})
