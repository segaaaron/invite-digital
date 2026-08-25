import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeEnvioDb, deleteEnvioEvent, seedEnvioEvent } from './fixtures/envio'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-envio-e2e'

test.afterAll(async () => {
  await deleteEnvioEvent(SLUG)
  await closeEnvioDb()
})

test('reenviar rota el enlace: el viejo deja de abrir y el nuevo abre', async ({ page, browser }) => {
  const { token } = await seedEnvioEvent(SLUG)

  // El enlace sembrado funciona.
  const invitado = await (await browser.newContext()).newPage()
  expect((await invitado.goto(`/i/${token}`))?.status()).toBe(200)

  // El atelier lo reenvía.
  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=envio`)
  await page.getByRole('button', { name: /generar enlace|reenviar/i }).first().click()
  const nuevo = await page.getByLabel('Enlace de la invitación').inputValue()
  expect(nuevo).toMatch(/\/i\/[A-Za-z0-9_-]{22}$/)

  // El viejo ya no abre nada; el nuevo sí.
  expect((await invitado.goto(`/i/${token}`))?.status()).toBe(404)
  expect((await invitado.goto(nuevo))?.status()).toBe(200)
})

test('la importación dice fila por fila qué entró y qué no', async ({ page }) => {
  const slug = `${SLUG}-csv`
  await seedEnvioEvent(slug)

  await page.goto(`/panel/eventos/${slug}/invitados`)
  await page.getByLabel(/pega el listado/i).fill('Familia García;5;+59170022233\n;3\nAna Vega;2;')
  await page.getByRole('button', { name: 'Importar invitados' }).click()

  const informe = page.getByRole('status')
  await expect(informe).toContainText('2 creadas')
  await expect(informe).toContainText('1 rechazadas')
  await expect(informe).toContainText('Sin etiqueta')
  await expect(page.getByLabel('Enlace de Familia García')).toHaveValue(/\/i\/[A-Za-z0-9_-]{22}$/)

  await deleteEnvioEvent(slug)
})
