import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: ADMIN_AUTH_STATE })
// En serie: las dos pruebas tocan los mismos ajustes de cobro (`payment.*`).
test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await sql`delete from app_settings where key like 'payment.%'`
  await sql.end({ timeout: 5 })
})

test('los datos de cobro se editan sin desplegar y llegan a la página del pedido', async ({ page, browser }) => {
  await sql`delete from app_settings where key like 'payment.%'`

  // --- Sin datos, la página del pedido no finge que se puede pagar.
  const cliente = await (await browser.newContext()).newPage()
  await cliente.goto('/es/pedido/gala')
  await cliente.getByLabel('Tu nombre').fill('Cliente de cobros e2e')
  await cliente.getByLabel('WhatsApp', { exact: true }).fill('+59170055566')
  await cliente.getByLabel(/^Correo/).fill('pedido-e2e@ejemplo.bo')
  await cliente.getByLabel('Fecha del evento').fill('2027-03-20')
  await cliente.getByLabel('Tipo de evento').selectOption('boda')
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

// Un PNG mínimo de verdad: la acción mira los primeros bytes.
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100' +
    '05fe02fea7c2b3000000000049454e44ae426082',
  'hex',
)

test('el QR de cobro se sube y queda servido para quien va a pagar (13 oct, sin cobertura hasta hoy)', async ({ page, browser }) => {
  await page.goto('/panel/admin/pagos')
  await page.getByLabel('Elegir imagen del QR').setInputFiles({ name: 'qr-banco.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: /^(Subir QR|Cambiar imagen)$/ }).click()
  await expect(page.getByRole('img', { name: 'QR de cobro cargado' })).toBeVisible()

  // La imagen se sirve sin sesión: está hecha para que la escanee quien paga.
  const anonimo = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage()
  const respuesta = await anonimo.goto('/qr-de-cobro')
  expect(respuesta?.status()).toBe(200)
  expect(respuesta?.headers()['content-type']).toMatch(/^image\//)
})

