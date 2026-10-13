import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: ADMIN_AUTH_STATE })

const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const ref = Array.from({ length: 8 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
const sufijo = crypto.randomUUID().slice(0, 6)
const nombre = `Ventas E2E ${sufijo}`
const correo = `ventas-e2e-${sufijo}@example.com`
/** Una consulta sola, sin pedido: la que se contesta desde el tablero. */
const suelta = `Consulta suelta E2E ${sufijo}`
const correoSuelta = `suelta-e2e-${sufijo}@example.com`

test.beforeAll(async () => {
  await sql`insert into consultation_requests (name, email, phone, locale) values (${nombre}, ${correo}, '+591 7555 0101', 'es')`
  await sql`insert into consultation_requests (name, email, phone, locale) values (${suelta}, ${correoSuelta}, '+591 7555 0202', 'es')`
  await sql`insert into orders (public_ref, plan_id, customer_name, contact, status, amount_cents, currency)
            values (${ref}, (select id from plans where slug = 'atelier'), ${nombre}, '75550101', 'proof_submitted', 100000, 'BOB')`
})

test.afterAll(async () => {
  await sql`delete from orders where public_ref = ${ref}`
  await sql`delete from consultation_requests where email in (${correo}, ${correoSuelta})`
  await sql.end({ timeout: 5 })
})

test('la consulta y su pedido son una sola venta: una fila, una ficha con su recorrido y la decisión', async ({ page }) => {
  // La lista con su ficha al lado (maqueta E02): cada fila dice su etapa.
  await page.goto('/panel/admin/ventas')
  const lista = page.getByRole('region', { name: 'Lista de ventas' })
  const ficha = page.locator('section[aria-labelledby="ficha-de-venta"]')
  // La misma persona (mismo teléfono) no sale dos veces: su consulta va dentro de su pedido.
  await expect(lista.getByRole('link', { name: new RegExp(nombre) })).toHaveCount(1)
  await expect(lista.getByRole('link', { name: new RegExp(nombre) })).toContainText('Por revisar')

  await lista.getByRole('link', { name: new RegExp(nombre) }).click()
  await expect(page).toHaveURL(new RegExp(`venta=p-${ref}`))
  await expect(ficha.getByRole('heading', { name: nombre })).toBeVisible()
  await ficha.getByText('Recorrido y datos').click()
  await expect(ficha.getByText('Escribió desde la web')).toBeVisible()
  await expect(ficha.getByRole('button', { name: 'Aprobar pago' })).toBeVisible()

  // Una consulta sola se contesta de un toque: abre WhatsApp y pasa a «Contactadas».
  await lista.getByRole('link', { name: new RegExp(suelta) }).click()
  await expect(ficha.getByRole('heading', { name: suelta })).toBeVisible()
  const [whatsapp] = await Promise.all([page.waitForEvent('popup'), ficha.getByRole('button', { name: /Contactar/ }).click()])
  await whatsapp.close()
  await expect.poll(async () => (await sql<{ status: string }[]>`select status from consultation_requests where email = ${correoSuelta}`)[0]?.status).toBe('contacted')
  await page.goto('/panel/admin/ventas?etapa=consultas')
  await expect(lista.getByRole('link', { name: new RegExp(suelta) })).toContainText('Contactada')
})

test('clientes junta la consulta y el pedido de la misma persona, y ⌘K lleva a su venta', async ({ page }) => {
  await page.goto(`/panel/admin/clientes?q=${encodeURIComponent(correo)}`)
  await page.getByRole('region', { name: 'Lista de clientes' }).getByRole('link', { name: new RegExp(nombre) }).click()
  // La ficha del cliente, al lado de la lista (maqueta E04).
  const ficha = page.locator('section[aria-labelledby="ficha-de-cliente"]')
  await expect(ficha.getByRole('link', { name: 'Escribió desde la web' })).toBeVisible()
  await expect(ficha.getByRole('link', { name: 'Pedido Atelier' })).toBeVisible()
  // Su etapa la dice la fila de la lista (maqueta E04).
  await expect(page.getByRole('region', { name: 'Lista de clientes' }).getByRole('link', { name: new RegExp(nombre) })).toContainText('Pidió plan')

  await page.keyboard.press('ControlOrMeta+k')
  const buscador = page.locator('dialog[open]')
  await buscador.getByRole('searchbox').fill(ref)
  await page.keyboard.press('Enter')
  await buscador.getByRole('link', { name: new RegExp(ref) }).first().click()
  await expect(page).toHaveURL(new RegExp(`/panel/admin/ventas\\?venta=p-${ref}`))
  await expect(page.locator('section[aria-labelledby="ficha-de-venta"]').getByRole('heading', { name: nombre })).toBeVisible()
})
