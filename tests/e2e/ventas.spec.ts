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

test.beforeAll(async () => {
  await sql`insert into consultation_requests (name, email, phone, locale) values (${nombre}, ${correo}, '+591 7555 0101', 'es')`
  await sql`insert into orders (public_ref, plan_id, customer_name, contact, status, amount_cents, currency)
            values (${ref}, (select id from plans where slug = 'atelier'), ${nombre}, '75550101', 'proof_submitted', 100000, 'BOB')`
})

test.afterAll(async () => {
  await sql`delete from orders where public_ref = ${ref}`
  await sql`delete from consultation_requests where email = ${correo}`
  await sql.end({ timeout: 5 })
})

test('el tablero de ventas abre cada tarjeta en un panel lateral y la consulta avanza de etapa', async ({ page }) => {
  await page.goto('/panel/admin/ventas')
  const nuevas = page.locator('section[aria-labelledby="etapa-nuevas"]')
  const revisar = page.locator('section[aria-labelledby="etapa-revisar"]')
  await expect(nuevas.getByRole('link', { name: new RegExp(nombre) })).toBeVisible()
  await expect(revisar.getByRole('link', { name: new RegExp(nombre) })).toBeVisible()

  // El pedido se abre encima del tablero, con la decisión dentro, y Escape vuelve al tablero.
  await revisar.getByRole('link', { name: new RegExp(nombre) }).click()
  await expect(page).toHaveURL(new RegExp(`pedido=${ref}`))
  const panel = page.locator('dialog[open]')
  await expect(panel.getByRole('heading', { name: `Pedido ${ref}` })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Aprobar pago' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).not.toHaveURL(/pedido=/)
  await expect(page.locator('dialog[open]')).toHaveCount(0)

  // La consulta se contesta desde su panel y pasa a «Contactadas» sin salir del tablero.
  await nuevas.getByRole('link', { name: new RegExp(nombre) }).click()
  await page.locator('dialog[open]').getByRole('button', { name: 'Contactada', exact: true }).click()
  await expect(page.locator('section[aria-labelledby="etapa-contactadas"]').getByRole('link', { name: new RegExp(nombre) })).toBeVisible()
})

test('clientes junta la consulta y el pedido de la misma persona, y ⌘K lleva a su pedido', async ({ page }) => {
  await page.goto(`/panel/admin/clientes?q=${encodeURIComponent(correo)}`)
  await page.getByRole('link', { name: new RegExp(nombre) }).click()
  const ficha = page.locator('dialog[open]')
  await expect(ficha.getByText('Pedidos · 1')).toBeVisible()
  await expect(ficha.getByText('Consultas · 1')).toBeVisible()

  await page.keyboard.press('Escape')
  await page.keyboard.press('ControlOrMeta+k')
  const buscador = page.locator('dialog[open]')
  await buscador.getByRole('searchbox').fill(ref)
  await page.keyboard.press('Enter')
  await buscador.getByRole('link', { name: new RegExp(ref) }).first().click()
  await expect(page).toHaveURL(new RegExp(`/panel/admin/ventas\\?pedido=${ref}`))
  await expect(page.locator('dialog[open]').getByRole('heading', { name: `Pedido ${ref}` })).toBeVisible()
})
