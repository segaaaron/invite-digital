import { expect, test, type Page } from '@playwright/test'
import { ADMIN } from './fixtures/atelier'
import { OTRO, closeTenancyDb, deleteTenancyFixture, seedOtroAtelier } from './fixtures/tenancy'

const SLUG = 'boda-del-otro-e2e'

test.afterAll(async () => {
  await deleteTenancyFixture(SLUG)
  await closeTenancyDb()
})

async function entrar(page: Page, quien: { email: string; password: string }): Promise<void> {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(quien.email)
  await page.getByLabel('Contraseña').fill(quien.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+|\/admin)?$/)
}

test('un atelier no ve ni toca el evento de otro; el admin solo su ficha', async ({ browser }) => {
  const { eventId, userId } = await seedOtroAtelier(SLUG)

  // --- El otro atelier: es suyo, lo ve.
  const suyo = await (await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': '10.99.0.6' } })).newPage()
  await entrar(suyo, OTRO)
  expect((await suyo.goto(`/panel/eventos/${SLUG}`))?.status()).toBe(200)

  // Y no ve la administración: ni el rótulo de la barra, ni la ruta.
  await expect(suyo.getByRole('link', { name: 'Hoy', exact: true })).toHaveCount(0)
  // **404, no 403.** Un 403 confirmaría que la sección existe.
  expect((await suyo.goto('/panel/admin'))?.status()).toBe(404)
  expect((await suyo.goto('/panel/admin/usuarios'))?.status()).toBe(404)

  // --- Un tercero con sesión propia no llega al evento del otro.
  //     `atelier@` es admin, así que hace falta comprobarlo al revés: el otro atelier no
  //     llega a los eventos de la demo, que son del admin.
  const respuestaAjena = await suyo.goto('/panel/eventos/demo-boda')
  expect(respuestaAjena?.status()).toBe(404)

  // Y su bandeja solo tiene lo suyo. Acotado al `main`: el título del evento activo sale
  // también en la tarjeta de usuario de la barra.
  await suyo.goto('/panel')
  const bandeja = suyo.getByRole('main')
  await expect(bandeja.getByRole('link', { name: /Boda del otro atelier/ })).toBeVisible()
  await expect(bandeja.getByText('María & Alejandro')).toHaveCount(0)

  // --- El admin abre la ficha del evento del otro, no sus datos (15 de septiembre): esos
  // los ve entrando como el cliente, con motivo y registro.
  const admin = await (await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': '10.99.0.6' } })).newPage()
  await entrar(admin, ADMIN)
  expect((await admin.goto(`/panel/eventos/${SLUG}`))?.status()).toBe(404)
  expect((await admin.goto(`/panel/eventos/${SLUG}/configuracion`))?.status()).toBe(200)
  // Dentro del evento, solo su menú: la administración queda detrás de «← Volver».
  await expect(admin.getByRole('link', { name: 'Volver a la administración' })).toBeVisible()
  await expect(admin.getByRole('link', { name: 'Hoy', exact: true })).toHaveCount(0)

  // La cartera del admin trae el evento del otro con su responsable.
  // Buscado por su nombre: la cartera pinta de veinte en veinte, y con más eventos en la base
  // este quedaba detrás de «Ver más» según las fechas de los demás.
  await admin.goto(`/panel/admin/eventos?q=${encodeURIComponent('Boda del otro atelier')}`)
  const fila = admin.getByRole('listitem').filter({ hasText: 'Boda del otro atelier' })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText(OTRO.email)
  // Y en la ficha, el selector de responsable viene preseleccionado con él: reasignar es un
  // cambio, no una elección a ciegas. Se cambia ahí, una sola vez; la fila no tiene mandos.
  await admin.goto(`/panel/eventos/${SLUG}/configuracion`)
  await expect(admin.getByLabel('Atelier responsable')).toHaveValue(userId)

  expect(eventId).toMatch(/^[0-9a-f-]{36}$/)
})
