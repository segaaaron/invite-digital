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

  // Con el parámetro, no pulsando el botón de la cabecera: la prueba no depende de un
  // clic previo para llegar al formulario.
  await page.goto(`/panel/eventos/${slug}/invitados?panel=importar`)
  await page.getByLabel(/pega el listado/i).fill('Familia García;5;+59170022233\n;3\nAna Vega;2;')
  await page.getByRole('button', { name: 'Importar invitados' }).click()

  const informe = page.getByRole('status')
  await expect(informe).toContainText('2 creadas')
  await expect(informe).toContainText('1 rechazadas')
  await expect(informe).toContainText('Sin etiqueta')
  await expect(page.getByLabel('Enlace de Familia García')).toHaveValue(/\/i\/[A-Za-z0-9_-]{22}$/)

  // La hoja de reparto trae un QR por enlace creado, y solo por los creados: la fila
  // rechazada no tiene enlace que imprimir.
  await expect(page.getByRole('img', { name: 'Invitación de Familia García' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Invitación de Ana Vega' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Invitación de/ })).toHaveCount(2)

  await deleteEnvioEvent(slug)
})

test('la hoja de reparto se imprime sola: el resto del panel no sale en el papel', async ({ page }) => {
  const slug = `${SLUG}-qr`
  await seedEnvioEvent(slug)

  await page.goto(`/panel/eventos/${slug}/invitados?panel=envio`)
  await page.getByRole('button', { name: /generar enlace|reenviar/i }).first().click()
  await expect(page.getByRole('img', { name: 'Invitación de Familia Rojas Peña' })).toBeVisible()

  // Con el papel puesto, lo único visible es la tarjeta. Se mide con `visibility`
  // calculada, que es justo lo que la regla cambia; `toBeVisible` de Playwright no
  // consulta el medio de impresión.
  await page.emulateMedia({ media: 'print' })
  const oculto = await page.evaluate(() => {
    document.body.dataset.imprimiendo = 'tarjeta'
    const tarjeta = document.querySelector('[data-para-imprimir]')
    const barra = document.querySelector('nav')
    return {
      tarjeta: tarjeta === null ? null : getComputedStyle(tarjeta).visibility,
      barra: barra === null ? null : getComputedStyle(barra).visibility,
    }
  })

  expect(oculto.tarjeta).toBe('visible')
  expect(oculto.barra).toBe('hidden')

  await deleteEnvioEvent(slug)
})
