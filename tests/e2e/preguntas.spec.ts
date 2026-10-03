import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

/** Cuenta propia: el límite de intentos es por cuenta y otras suites entran con `CLIENTE`. */
const CUENTA = { email: 'cliente-preguntas-e2e@invitepremium.bo', password: CLIENTE.password }

/**
 * Las preguntas al confirmar: el anfitrión pide canción, menú y actos; el invitado los contesta
 * al decir que viene; el resumen los cuenta.
 */
const SLUG = 'boda-preguntas-e2e'

test.describe.configure({ mode: 'serial' })

test.describe('las preguntas al confirmar', () => {
  let ctx: BrowserContext
  let page: Page
  let token: string

  test.beforeAll(async ({ browser }) => {
    token = (await seedCliente(SLUG, CUENTA)).token
    ctx = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.77' } })
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

  test('el anfitrión elige qué preguntar', async () => {
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    await page.getByLabel('Pedir una canción que no puede faltar').check()
    await page.getByLabel(/Menús para elegir/).fill('Carne\nPollo')
    await page.getByLabel(/Actos/).fill('Iglesia\nFiesta')
    await page.getByRole('button', { name: 'Guardar preguntas' }).click()
    await expect(async () => {
      await page.reload()
      await expect(page.getByLabel(/Menús para elegir/)).toHaveValue('Carne\nPollo', { timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
  })

  test('el invitado contesta al decir que viene', async ({ browser }) => {
    const invitado = await (await browser.newContext()).newPage()
    await invitado.goto(`/i/${token}`)
    // La portada se abre con un toque.
    await invitado.locator('[data-portada]').first().click({ force: true }).catch(() => {})
    await invitado.getByRole('button', { name: 'ASISTIRÉ' }).click()
    await invitado.getByLabel('Tu menú').selectOption('Pollo')
    await invitado.getByLabel('Una canción que no puede faltar').fill('La Bomba · Azul Azul')
    await invitado.getByRole('button', { name: /ENVIAR RESPUESTA/ }).click()
    await expect(invitado.getByText('Confirmación enviada')).toBeVisible()
    await invitado.context().close()
  })

  test('el resumen cuenta lo que contestaron', async () => {
    await page.goto(`/panel/eventos/${SLUG}`)
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Lo que contestaron' }) })
    await expect(tarjeta.getByText('Pollo · 1')).toBeVisible()
    await expect(tarjeta.getByText('Iglesia · 1')).toBeVisible()
    await expect(tarjeta.getByText('La Bomba · Azul Azul')).toBeVisible()
  })
})
