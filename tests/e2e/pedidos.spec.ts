import { expect, test } from '@playwright/test'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'
import { closePedidosDb, deleteTestOrders } from './fixtures/pedidos'

const CLIENTE = 'Cliente de prueba e2e'

// Un PNG mínimo de verdad: la validación mira los primeros bytes, así que un fichero de
// texto renombrado no serviría para probar el camino feliz.
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100' +
    '05fe02fea7c2b3000000000049454e44ae426082',
  'hex',
)

test.afterAll(async () => {
  await deleteTestOrders(CLIENTE)
  await closePedidosDb()
})

test('el pedido va de la web al panel: referencia, comprobante y aprobación', async ({ page, browser }) => {
  await deleteTestOrders(CLIENTE)

  // 1. El cliente pide desde la web pública, sin sesión.
  await page.goto('/es/pedido/firma-3d')
  await page.getByLabel('Tu nombre').fill(CLIENTE)
  await page.getByLabel('WhatsApp o correo').fill('+59170099988')
  await page.getByRole('button', { name: 'Registrar pedido' }).click()

  const referencia = await page.getByText(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/).innerText()
  expect(referencia).toHaveLength(8)

  // 2. Sube su comprobante desde la página de seguimiento.
  await page.getByRole('link', { name: 'Ir a pagar' }).click()
  await page.getByLabel('Comprobante de la transferencia').setInputFiles({
    name: 'comprobante.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await page.getByRole('button', { name: 'Enviar comprobante' }).click()
  await expect(page.getByRole('status')).toContainText('Comprobante recibido')

  // 3. El **admin** lo ve y lo aprueba: los pedidos del Plan B compran planes de
  // Luxury Atelier, y aprobar crea cuentas y eventos. Un atelier recibe 404.
  const atelier = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
  await atelier.goto('/panel/pedidos')
  const tarjeta = atelier.locator('section', { hasText: referencia }).first()
  await expect(tarjeta).toContainText('Por revisar')

  // El comprobante se descarga, no se pinta: viene con `attachment`.
  const enlace = tarjeta.getByRole('link', { name: 'comprobante.png' })
  await expect(enlace).toBeVisible()

  await tarjeta.getByRole('button', { name: 'Aprobar pago' }).click()
  await expect(atelier.locator('section', { hasText: referencia }).first()).toContainText('Aprobado')

  // 4. Y el cliente lo ve aprobado en su misma dirección.
  await page.reload()
  await expect(page.getByText('Pago confirmado')).toBeVisible()
})

test('el comprobante no se descarga sin sesión, y una referencia inventada es 404', async ({ page }) => {
  // Sin sesión, el route handler redirige a la entrada del panel en vez de servir el
  // fichero: dentro va el nombre, el banco y la cuenta de una persona.
  const respuesta = await page.goto(`/panel/pedidos/comprobante/${crypto.randomUUID()}`)
  expect(page.url()).toContain('/panel/entrar')
  expect(respuesta?.headers()['content-type']).not.toContain('image/')

  expect((await page.goto('/es/pedido/ref/ZZZZZZZZ'))?.status()).toBe(404)
})

test('un archivo que miente sobre su tipo se rechaza en el servidor', async ({ page }) => {
  await deleteTestOrders(CLIENTE)

  await page.goto('/es/pedido/firma-3d')
  await page.getByLabel('Tu nombre').fill(CLIENTE)
  await page.getByLabel('WhatsApp o correo').fill('+59170099988')
  await page.getByRole('button', { name: 'Registrar pedido' }).click()
  await page.getByRole('link', { name: 'Ir a pagar' }).click()

  // Un ejecutable con nombre y tipo de imagen: las dos cosas las escribe quien sube.
  await page.getByLabel('Comprobante de la transferencia').setInputFiles({
    name: 'comprobante.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
  })
  await page.getByRole('button', { name: 'Enviar comprobante' }).click()

  // Acotado al formulario: Next monta su propio `role="alert"` para anunciar la ruta.
  await expect(page.getByText('Solo aceptamos una foto')).toBeVisible()
})
