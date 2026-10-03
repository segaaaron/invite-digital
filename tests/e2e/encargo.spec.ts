import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

/** Cuenta propia: el límite de intentos es por cuenta y otras suites entran con `CLIENTE`. */
const CUENTA = { email: 'cliente-encargo-e2e@invitepremium.bo', password: CLIENTE.password }

/**
 * El diseño por encargo de punta a punta: el cliente manda sus datos, el equipo le envía la
 * versión, el cliente pide cambios (una ronda), el equipo la devuelve por error suyo, el cliente
 * aprueba, y repartir espera al saldo.
 */
const SLUG = 'xv-encargo-e2e'
const REF = 'ENCRG2E2'
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.describe.configure({ mode: 'serial' })

test.describe('el diseño por encargo', () => {
  let clienteCtx: BrowserContext
  let equipoCtx: BrowserContext
  let cliente: Page
  let equipo: Page
  let eventId: string

  test.beforeAll(async ({ browser }) => {
    await sql`delete from orders where public_ref = ${REF}`
    eventId = (await seedCliente(SLUG, CUENTA)).eventId
    await sql`insert into event_design (event_id, rounds_included, delivery_days) values (${eventId}, 1, 3)`
    await sql`
      insert into orders (public_ref, customer_name, contact, status, amount_cents, deposit_cents, currency, event_id, decided_at)
      values (${REF}, 'Encargo e2e', '+59170000001', 'approved', 69000, 10000, 'BOB', ${eventId}, now())`

    clienteCtx = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.7' } })
    cliente = await clienteCtx.newPage()
    await cliente.goto('/panel/entrar')
    await cliente.getByLabel('Correo').fill(CUENTA.email)
    await cliente.getByLabel('Contraseña').fill(CUENTA.password)
    await cliente.getByRole('button', { name: 'Entrar' }).click()
    await expect(cliente).toHaveURL(/\/panel\/eventos\//)

    equipoCtx = await browser.newContext({ storageState: ADMIN_AUTH_STATE })
    equipo = await equipoCtx.newPage()
  })

  test.afterAll(async () => {
    await clienteCtx?.close()
    await equipoCtx?.close()
    await sql`delete from orders where public_ref = ${REF}`
    await sql`delete from audit_log where subject = ${SLUG}`
    await deleteClienteFixture(SLUG, CUENTA)
    await closeClienteDb()
    await sql.end({ timeout: 5 })
  })

  // La tarjeta de los pasos (un `section` con su título).
  const pasos = () => cliente.locator('section').filter({ has: cliente.getByRole('heading', { name: 'Tu invitación, paso a paso' }) })

  test('el cliente manda sus datos y entra en diseño con fecha de entrega', async () => {
    await cliente.goto(`/panel/eventos/${SLUG}/configuracion`)
    await pasos().getByRole('button', { name: 'Enviar mis datos para diseñar' }).click()
    // La acción revalida y la tarjeta vuelve con el paso nuevo: eso es lo que se espera.
    await expect(pasos().getByText('Te la entregamos hasta el', { exact: false })).toBeVisible()
  })

  test('el equipo lo ve en Hoy y le envía la versión', async () => {
    await equipo.goto('/panel/admin')
    const porEntregar = equipo.locator('section').filter({ has: equipo.getByRole('heading', { name: 'Diseños por entregar' }) })
    await expect(porEntregar.getByRole('link', { name: 'Boda con acceso de cliente' })).toBeVisible()
    await equipo.goto(`/panel/eventos/${SLUG}/configuracion`)
    await equipo.getByRole('button', { name: 'Versión lista: avisar al cliente' }).click()
    await expect(equipo.getByText('Versión enviada, la está revisando')).toBeVisible()
  })

  test('el cliente pide cambios: gasta su única ronda', async () => {
    await cliente.reload()
    await expect(pasos().getByText('te queda 1 ronda de 1', { exact: false })).toBeVisible()
    await pasos().getByRole('textbox').fill('Cambia la hora a 20:00 y corrige el nombre de mi mamá.')
    await pasos().getByRole('button', { name: 'Enviar mis cambios' }).click()
    await expect(pasos().getByText('Estamos diseñando tu invitación.', { exact: false })).toBeVisible()
  })

  test('el equipo la devuelve por error suyo y envía la nueva versión', async () => {
    await equipo.reload()
    await expect(equipo.getByText('Cambia la hora a 20:00', { exact: false })).toBeVisible()
    await equipo.getByRole('button', { name: 'Error nuestro: no cuenta' }).click()
    await expect(equipo.getByText('no contó (error nuestro)', { exact: false })).toBeVisible()
    await expect(equipo.getByText('rondas 0 de 1', { exact: false })).toBeVisible()
    await equipo.getByRole('button', { name: 'Versión lista: avisar al cliente' }).click()
    await expect(equipo.getByText('Versión enviada, la está revisando')).toBeVisible()
  })

  test('el cliente aprueba con la ronda devuelta, y repartir espera al saldo', async () => {
    await cliente.reload()
    await expect(pasos().getByText('te queda 1 ronda de 1', { exact: false })).toBeVisible()
    await pasos().getByRole('button', { name: 'Aprobar mi invitación' }).click()
    await expect(pasos().getByText('En cuanto registremos el saldo', { exact: false })).toBeVisible()

    await sql`update orders set balance_paid_at = now() where public_ref = ${REF}`
    await cliente.reload()
    await expect(pasos().getByText('Aprobada y lista', { exact: false })).toBeVisible()
  })
})
