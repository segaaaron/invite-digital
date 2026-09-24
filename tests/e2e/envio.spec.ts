import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeEnvioDb, deleteEnvioEvent, seedEnvioEvent } from './fixtures/envio'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-envio-e2e'

test.afterAll(async () => {
  await deleteEnvioEvent(SLUG)
  await closeEnvioDb()
})

test('enviar guarda el enlace y lo enseña siempre igual; generar uno nuevo invalida el anterior', async ({ page, browser }) => {
  const { token } = await seedEnvioEvent(SLUG)
  const invitado = await (await browser.newContext()).newPage()
  expect((await invitado.goto(`/i/${token}`))?.status()).toBe(200)

  // Enviar por WhatsApp prepara su enlace y lo guarda (cifrado): desde el 16 de septiembre
  // **enviar no rota**. El sembrado no estaba guardado, así que se acuña uno y queda fijo.
  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=envio`)
  const whatsapp = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Enviar por WhatsApp a Familia Rojas Peña' }).click()
  await (await whatsapp).close()
  const fila = page.getByRole('listitem', { name: 'Familia Rojas Peña' })
  await fila.getByRole('button', { name: /Enlace y otras formas/ }).click()
  const campo = fila.getByLabel('Enlace de la invitación de Familia Rojas Peña')
  const enviado = await campo.inputValue()
  expect(enviado).toMatch(/\/i\/[A-Za-z0-9_-]{22}$/)
  expect((await invitado.goto(enviado))?.status()).toBe(200)

  // Rotar es aparte y con confirmación, en «Enviadas»: «¿Lo perdió?».
  await page.getByRole('tab', { name: /Enviadas/ }).click()
  // La fila sigue abierta al cambiar de pestaña: no se vuelve a pulsar, que la cerraría.
  await expect(fila.getByRole('button', { name: /Enlace y otras formas/ })).toHaveAttribute('aria-expanded', 'true')
  await fila.getByRole('button', { name: /Generar un enlace nuevo/ }).click()
  await fila.getByRole('button', { name: 'Sí, generar uno nuevo' }).click()
  await expect(campo).not.toHaveValue(enviado)
  const nuevo = await campo.inputValue()
  expect(nuevo).toMatch(/\/i\/[A-Za-z0-9_-]{22}$/)

  // El anterior ya no abre nada; el nuevo sí.
  expect((await invitado.goto(enviado))?.status()).toBe(404)
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

  // Un QR digital por enlace creado, y solo por los creados: la fila rechazada no tiene enlace.
  await expect(page.getByRole('img', { name: 'Código QR de Familia García' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Código QR de Ana Vega' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Código QR de/ })).toHaveCount(2)

  await deleteEnvioEvent(slug)
})

test('el QR del invitado es digital: se descarga como imagen, no se imprime', async ({ page }) => {
  const slug = `${SLUG}-qr`
  await seedEnvioEvent(slug)

  await page.goto(`/panel/eventos/${slug}/invitados?panel=envio`)
  const fila = page.getByRole('listitem', { name: 'Familia Rojas Peña' })
  await fila.getByRole('button', { name: /Enlace y otras formas/ }).click()
  await expect(fila.getByRole('img', { name: 'Código QR de Familia Rojas Peña' })).toBeVisible()

  // «Descargar QR» baja un PNG con el nombre del invitado; nada de hojas para imprimir.
  const descarga = page.waitForEvent('download')
  await fila.getByRole('button', { name: 'Descargar QR' }).click()
  expect((await descarga).suggestedFilename()).toBe('familia-rojas-pena-qr.png')

  await deleteEnvioEvent(slug)
})
