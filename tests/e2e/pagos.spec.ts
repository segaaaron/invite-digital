import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: ADMIN_AUTH_STATE })

test.afterAll(async () => {
  await sql`delete from app_settings where key like 'payment.%'`
  await sql.end({ timeout: 5 })
})

test('los datos de cobro se editan sin desplegar y llegan a la página del pedido', async ({ page, browser }) => {
  await sql`delete from app_settings where key like 'payment.%'`

  // --- Sin datos, la página del pedido no finge que se puede pagar.
  const cliente = await (await browser.newContext()).newPage()
  await cliente.goto('/es/pedido/firma-3d')
  await cliente.getByLabel('Tu nombre').fill('Cliente de cobros e2e')
  await cliente.getByLabel('WhatsApp o correo').fill('+59170055566')
  await cliente.getByRole('button', { name: 'Registrar pedido' }).click()
  await cliente.getByRole('link', { name: 'Ir a pagar' }).click()

  // Media ficha es peor que ninguna: sin los tres datos se dice la verdad.
  await expect(cliente.getByText(/preparando los datos de transferencia/i)).toBeVisible()
  const seguimiento = cliente.url()

  // --- El admin los carga.
  await page.goto('/panel/admin/pagos')
  await page.getByLabel('Banco', { exact: true }).fill('Banco de prueba')
  await page.getByLabel('Titular de la cuenta').fill('Atelier de prueba SRL')
  await page.getByLabel('Número de cuenta').fill('9876543210')
  await page.getByRole('button', { name: 'Guardar datos' }).click()
  await expect(page.getByText('Datos de cobro guardados.')).toBeVisible()

  // --- Y aparecen en el pedido que ya existía, sin desplegar nada.
  await cliente.goto(seguimiento)
  await expect(cliente.getByText('Banco de prueba')).toBeVisible()
  await expect(cliente.getByText('9876543210')).toBeVisible()

  // La imagen del QR no está cargada: la ruta lo dice con un 404, no con un icono roto.
  expect((await cliente.goto('/qr-de-cobro'))?.status()).toBe(404)

  await sql`delete from orders where customer_name = 'Cliente de cobros e2e'`
})
