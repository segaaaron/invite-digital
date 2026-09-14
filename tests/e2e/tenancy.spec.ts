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
  await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+)?$/)
}

test('un atelier no ve ni toca el evento de otro; el admin sí', async ({ browser }) => {
  const { eventId, userId } = await seedOtroAtelier(SLUG)

  // --- El otro atelier: es suyo, lo ve.
  const suyo = await (await browser.newContext()).newPage()
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

  // --- El admin entra en el evento del otro y ve la administración.
  const admin = await (await browser.newContext()).newPage()
  await entrar(admin, ADMIN)
  expect((await admin.goto(`/panel/eventos/${SLUG}`))?.status()).toBe(200)
  await expect(admin.getByRole('link', { name: 'Hoy', exact: true })).toBeVisible()

  // La bandeja del admin trae el evento del otro con su dueño. El correo sale varias
  // veces —también en cada selector de dueño—, así que se busca en la fila.
  await admin.goto('/panel/admin/eventos')
  const fila = admin.getByRole('listitem').filter({ hasText: 'Boda del otro atelier' })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText(OTRO.email)
  // Y el selector de dueño viene preseleccionado con él, que es lo que hace que
  // reasignar sea un cambio y no una elección a ciegas.
  await expect(fila.getByLabel('Dueño')).toHaveValue(userId)

  expect(eventId).toMatch(/^[0-9a-f-]{36}$/)
})
