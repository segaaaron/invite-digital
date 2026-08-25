import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeVenueDb, deleteVenueEvent, seedVenueEvent, tableLabelOf } from './fixtures/mesas'
import { createGuestGroup } from './helpers/panel'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-mesas-e2e'

test.afterAll(async () => {
  await deleteVenueEvent(SLUG)
  await deleteVenueEvent(`${SLUG}-plano`)
  await closeVenueDb()
})

test('el atelier reparte el salón y la puerta canta el número de mesa', async ({ page }) => {
  const { token, eventId } = await seedVenueEvent(SLUG)
  await createGuestGroup(page, SLUG, 'Familia Nieto', 2)

  // El alta es el diálogo de la maqueta, que abre «+ Añadir mesa». Se entra por la barra
  // de direcciones para no depender de un clic previo.
  const crearMesa = async (nombre: string, cupo: string) => {
    await page.goto(`/panel/eventos/${SLUG}/mesas?panel=mesa`)
    await page.getByLabel('Nombre de la mesa').fill(nombre)
    await page.getByLabel('Capacidad (asientos)').fill(cupo)
    await page.locator('dialog').getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.locator('dialog')).toHaveCount(0)
  }

  await crearMesa('Mesa 01', '8')
  // Las tarjetas de mesa viven tras el conmutador de la maqueta; el plano es la vista
  // por defecto, igual que en el diseño.
  await page.getByRole('button', { name: 'Vista de tarjetas' }).click()
  await expect(page.getByRole('heading', { name: 'Mesa 01' })).toBeVisible()

  await crearMesa('Mesa 02', '4')
  await page.getByRole('button', { name: 'Vista de tarjetas' }).click()
  await expect(page.getByRole('heading', { name: 'Mesa 02' })).toBeVisible()

  // Los dos grupos empiezan sin mesa.
  await expect(page.getByRole('region', { name: 'Invitados sin mesa' })).toContainText('2 sin mesa')

  // Uno se sienta a mano.
  const mesa01 = page.locator('article').filter({ hasText: 'Mesa 01' })
  await mesa01.getByLabel('Grupo a sentar en Mesa 01').selectOption({ label: 'Familia Rojas Peña · 4' })
  await mesa01.getByRole('button', { name: 'Sentar' }).click()
  await expect(mesa01).toContainText('4 / 8')

  // El resto lo reparte la auto-asignación.
  await page.getByRole('button', { name: '+ Auto-asignar' }).click()
  await expect(page.getByRole('region', { name: 'Invitados sin mesa' })).toBeHidden()

  // El plan del banquete lo lleva impreso.
  await page.goto(`/panel/eventos/${SLUG}/mesas/imprimir`)
  await expect(page.getByRole('heading', { name: 'Mesa 01' })).toBeVisible()
  await expect(page.getByText('Familia Rojas Peña')).toBeVisible()

  // Y la puerta canta el número al escanear el pase.
  await page.goto(`/panel/eventos/${SLUG}/puerta`)
  // Esperar a que la puerta esté montada antes de teclear: el escucha de teclado que
  // atiende al lector de códigos lo engancha React al hidratar, y teclear antes se
  // pierde en el vacío. Sin esta espera la prueba falla de forma reproducible.
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('0')
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/Bienvenidos/i)).toBeVisible()
  await expect(page.getByLabel('Mesa asignada')).toHaveText('Mesa 01')

  // Y está en la base, no solo en la pantalla.
  expect(await tableLabelOf(eventId, 'Familia Rojas Peña')).toBe('Mesa 01')
})

test('el plano no guarda hasta que se pulsa Guardar', async ({ page }) => {
  await seedVenueEvent(`${SLUG}-plano`)

  await page.goto(`/panel/eventos/${SLUG}-plano/mesas?panel=mesa`)
  await page.getByLabel('Nombre de la mesa').fill('Mesa 01')
  await page.locator('dialog').getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.locator('dialog')).toHaveCount(0)

  const plano = page.getByLabel('Plano del salón')
  const marca = plano.getByRole('button', { name: /Mesa 01/ })
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()

  // Con el teclado, que es como lo usa quien no tiene ratón.
  await marca.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByLabel('Estado del plano')).toContainText('sin guardar')

  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()

  // La posición sobrevive a una recarga: se guardó de verdad.
  await page.reload()
  await expect(plano.getByRole('button', { name: /Mesa 01/ })).toHaveCSS('left', /.+/)
  await expect(page.getByLabel('Estado del plano')).toContainText('Plano guardado')
})
