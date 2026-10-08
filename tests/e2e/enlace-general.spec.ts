import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

/** Cuenta propia: el límite de intentos es por cuenta y otras suites entran con `CLIENTE`. */
const CUENTA = { email: 'cliente-enlace-e2e@invitepremium.bo', password: CLIENTE.password }

/**
 * El enlace general: el anfitrión lo crea, alguien lo abre desde el grupo de la familia, escribe
 * su nombre y quién va con él, y sale con su invitación personal; el panel lo cuenta en la lista.
 */
const SLUG = 'boda-enlace-general-e2e'

test.describe.configure({ mode: 'serial' })

test.describe('el enlace general', () => {
  let ctx: BrowserContext
  let page: Page
  let enlace: string

  test.beforeAll(async ({ browser }) => {
    await seedCliente(SLUG, CUENTA)
    ctx = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.78' } })
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
  })

  test('el anfitrión crea el enlace general', async () => {
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Crear enlace general' }).click()
    const codigo = page.locator('code').filter({ hasText: '/abierta/' })
    await expect(codigo).toBeVisible()
    enlace = new URL((await codigo.innerText()).trim()).pathname
  })

  test('un invitado se da de alta y llega a su invitación personal', async ({ browser }) => {
    const invitado = await (await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': '10.99.0.79' } })).newPage()
    await invitado.goto(enlace)
    await invitado.getByLabel('Tu nombre y apellido').fill('Mónica Salvatierra')
    await invitado.getByLabel(/Quiénes van contigo/).fill('Jorge Salvatierra')
    await invitado.getByRole('button', { name: 'Ver mi invitación' }).click()
    // Llega por su enlace, marcado con el canal (`?utm_source=general`, 6 de octubre).
    await expect(invitado).toHaveURL(/\/i\/[A-Za-z0-9_-]+\?utm_source=general$/)
    await invitado.context().close()
  })

  test('aparece en la lista de invitados, con su acompañante', async () => {
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    // Una familia se pinta plegada con su cabecera: quién, cuántas personas y si ya se envió.
    await expect(page.getByRole('button', { name: /Mónica Salvatierra\s*2 personas\s*Enviado/ })).toBeVisible()
  })

  test('quitado, el enlace deja de abrir', async ({ browser }) => {
    await page.getByRole('button', { name: 'Quitar' }).click()
    await expect(page.locator('code').filter({ hasText: '/abierta/' })).toHaveCount(0)
    const anonimo = await (await browser.newContext()).newPage()
    expect((await anonimo.goto(enlace))?.status()).toBe(404)
    await anonimo.context().close()
  })
})
