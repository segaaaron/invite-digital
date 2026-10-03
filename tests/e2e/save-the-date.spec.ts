import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import postgres from 'postgres'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

/** Cuenta propia: el límite de intentos es por cuenta y otras suites entran con `CLIENTE`. */
const CUENTA = { email: 'cliente-std-e2e@invitepremium.bo', password: CLIENTE.password }

/**
 * El save the date: sin el extra, la tarjeta manda a Extras; con él, el cliente crea el enlace y
 * cualquiera ve la portada, la fecha y «Agregar a mi calendario». Quitado, 404.
 */
const SLUG = 'boda-save-the-date-e2e'
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.describe.configure({ mode: 'serial' })

test.describe('el save the date', () => {
  let ctx: BrowserContext
  let page: Page
  let eventId: string
  let enlace: string

  test.beforeAll(async ({ browser }) => {
    eventId = (await seedCliente(SLUG, CUENTA)).eventId
    ctx = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.80' } })
    page = await ctx.newPage()
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(CUENTA.email)
    await page.getByLabel('Contraseña').fill(CUENTA.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/panel\/eventos\//)
  })

  test.afterAll(async () => {
    await ctx?.close()
    await deleteClienteFixture(SLUG, CUENTA)
    await closeClienteDb()
    await sql.end({ timeout: 5 })
  })

  test('sin el extra, se pide en Extras', async () => {
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    await expect(page.getByRole('link', { name: 'Pedirlo en Extras' })).toBeVisible()
  })

  test('con el extra, el cliente crea el enlace', async () => {
    await sql`insert into event_addons (event_id, addon_slug, effect, amount) values (${eventId}, 'save-the-date', 'servicio', 0)`
    await page.reload()
    await page.getByRole('button', { name: 'Crear el save the date' }).click()
    const codigo = page.locator('code').filter({ hasText: '/guarda/' })
    await expect(codigo).toBeVisible()
    enlace = new URL((await codigo.innerText()).trim()).pathname
  })

  test('cualquiera lo abre: fecha, cuánto falta y calendario; y su imagen para WhatsApp', async ({ browser, request }) => {
    const anonimo = await (await browser.newContext()).newPage()
    await anonimo.goto(enlace)
    await expect(anonimo.getByText('Reserva la fecha')).toBeVisible()
    await expect(anonimo.getByText(/Faltan \d+ días|Falta 1 día|Es hoy/)).toBeVisible()
    await expect(anonimo.getByRole('link', { name: 'Agregar a mi calendario' })).toHaveAttribute('href', /calendar\.google\.com/)
    await anonimo.context().close()

    const imagen = await request.get(`${enlace}/imagen`)
    expect(imagen.status()).toBe(200)
    expect(imagen.headers()['content-type']).toBe('image/jpeg')
  })

  test('quitado, deja de abrir', async ({ browser }) => {
    await page.getByRole('button', { name: 'Quitar' }).last().click()
    await expect(page.locator('code').filter({ hasText: '/guarda/' })).toHaveCount(0)
    const anonimo = await (await browser.newContext()).newPage()
    expect((await anonimo.goto(enlace))?.status()).toBe(404)
    await anonimo.context().close()
  })
})
