import { expect, test } from '@playwright/test'
import { invitationFixtures } from './fixtures/invitation'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()

// Las páginas de invitado no llevan sesión del atelier.
test.use({ storageState: { cookies: [], origins: [] } })

test.afterAll(async () => {
  await closeInvitationDb()
})

/** Un PNG de un píxel: lo que importa aquí es que pase la firma de los primeros bytes. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('el invitado sube una foto desde su invitación y la ve entre las suyas', async ({ page }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-fotos-e2e' })

  await page.goto(`/i/${token}/fotos`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Comparte tus fotos')
  await expect(page.getByText('Todavía no has subido ninguna.')).toBeVisible()

  // El campo va oculto tras su etiqueta: en un teléfono, un botón de «subir» aparte son dos
  // toques más. Se envía al elegir el archivo.
  await page.setInputFiles('input[type=file]', { name: 'boda.png', mimeType: 'image/png', buffer: PNG })

  await expect(page.locator('main ul li')).toHaveCount(1)
  await expect(page.getByText('Te quedan 19')).toBeVisible()

  await deleteEvent(eventSlug)
})

test('un token inválido no deja subir nada', async ({ page }) => {
  expect((await page.goto('/i/tokenquenoexiste1234/fotos'))?.status()).toBe(404)
})

test('una invitación revocada tampoco', async ({ page }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-fotos-revocada-e2e', revoked: true })
  expect((await page.goto(`/i/${token}/fotos`))?.status()).toBe(404)
  await deleteEvent(eventSlug)
})
