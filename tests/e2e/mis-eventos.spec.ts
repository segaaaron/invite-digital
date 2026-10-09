import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import postgres from 'postgres'
import { closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'
import { escribirInvitacion } from './fixtures/invitacion-minima'

/**
 * El cliente que compró otro evento (8 de octubre): entra a «Mis eventos» y elige; el ya celebrado
 * se mira, pero no se cambia ni se borra nada.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const CUENTA = { email: 'mis-eventos-e2e@invitepremium.bo', password: 'contrasena-mis-eventos-1' } as const
const NUEVO = 'xv-mis-eventos-e2e'
const PASADO = 'boda-celebrada-e2e'

test.describe.configure({ mode: 'serial' })

test.describe('el cliente con dos eventos', () => {
  let contexto: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const { clienteId, duenoId } = await seedCliente(NUEVO, CUENTA)
    await sql`delete from events where slug = ${PASADO}`
    const [pasado] = await sql<{ id: string }[]>`
      insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id, user_id)
      values (${PASADO}, 'Boda celebrada', '2025-05-10', '2025-04-20', 'es', 'boda', 'live', (select id from plans where slug = 'alta-costura'), ${duenoId})
      returning id`
    await sql`insert into event_staff (event_id, user_id, membership) values (${pasado!.id}, ${clienteId}, 'cliente')`
    await escribirInvitacion(PASADO)

    contexto = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.31' } })
    page = await contexto.newPage()
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(CUENTA.email)
    await page.getByLabel('Contraseña').fill(CUENTA.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
  })

  test.afterAll(async () => {
    await contexto.close()
    await sql`delete from events where slug = ${PASADO}`
    await deleteClienteFixture(NUEVO, CUENTA)
    await closeClienteDb()
    await sql.end({ timeout: 5 })
  })

  test('entra a «Mis eventos»: lo que viene primero y lo celebrado dicho', async () => {
    await expect(page).toHaveURL(/\/panel$/)
    await expect(page.getByRole('heading', { name: 'Mis eventos' })).toBeVisible()
    const filas = page.locator('main li a')
    await expect(filas.nth(0)).toContainText('Boda con acceso de cliente')
    await expect(filas.nth(1)).toContainText('Boda celebrada')
    await expect(filas.nth(1)).toContainText('Ya se celebró')
  })

  test('desde un evento vuelve a «Mis eventos»', async () => {
    await page.goto(`/panel/eventos/${NUEVO}/invitados`)
    await expect(page.getByRole('link', { name: 'Mis eventos' }).first()).toHaveAttribute('href', '/panel')
  })

  test('el celebrado se mira, pero no se guarda nada', async () => {
    await page.goto(`/panel/eventos/${PASADO}/mesas?panel=mesa`)
    await expect(page.getByText('Este evento ya se celebró.')).toBeVisible()
    await page.getByLabel('Nombre de la mesa').fill('Mesa tardía')
    const guardar = page.locator('dialog').getByRole('button', { name: 'Guardar', exact: true })
    // Apagado: no recibe el toque.
    await expect(guardar).toHaveCSS('pointer-events', 'none')

    // Y aunque se le haga llegar el clic desde el navegador, el servidor no escribe: vuelve a la pantalla.
    await guardar.dispatchEvent('click')
    await expect(page).toHaveURL(new RegExp(`/panel/eventos/${PASADO}/mesas$`))
    const [n] = await sql<{ n: number }[]>`select count(*)::int as n from venue_tables t join events e on e.id = t.event_id where e.slug = ${PASADO}`
    expect(n!.n).toBe(0)
  })

  test('en el que viene, todo sigue igual', async () => {
    await page.goto(`/panel/eventos/${NUEVO}/mesas`)
    await expect(page.getByText('Este evento ya se celebró.')).toHaveCount(0)
  })
})
