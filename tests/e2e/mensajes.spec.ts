import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeGuestbookDb, deleteGuestbookEvent, noteOf, seedGuestbookEvent } from './fixtures/mensajes'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-mensajes-e2e'

test.afterAll(async () => {
  await deleteGuestbookEvent(SLUG)
  await closeGuestbookDb()
})

test('el invitado firma el libro, se le agradece, y él ve la respuesta', async ({ page }) => {
  const { eventId, token } = await seedGuestbookEvent(SLUG)

  // 1. El invitado confirma **con un mensaje**. El texto no vuelve a escribirse en
  //    ninguna tabla nueva: se queda en `rsvp_responses.message`, donde ya vivía.
  await page.goto(`/i/${token}`)
  await page.getByLabel('Mensaje para los anfitriones (opcional)').fill('Qué ganas de celebrar con ustedes.')
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(page.getByRole('status')).toContainText('Gracias')

  // 2. El libro de firmas lo muestra: sin «leído» ni «destacado», solo las palabras y quién las dejó.
  await page.goto(`/panel/eventos/${SLUG}/mensajes`)
  await expect(page.getByText('Qué ganas de celebrar con ustedes.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Marcar leído|Destacar/ })).toHaveCount(0)

  // 3. Se le agradece, y la respuesta llega a la base.
  await page.getByRole('button', { name: 'Agradecer' }).first().click()
  await page.getByLabel(/^Agradecer a /).fill('Gracias, los esperamos con muchas ganas.')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Tu agradecimiento')).toBeVisible()

  await expect
    .poll(async () => (await noteOf(eventId))?.reply)
    .toBe('Gracias, los esperamos con muchas ganas.')

  // 4. El invitado recarga su enlace y ve la respuesta.
  await page.goto(`/i/${token}`)
  await expect(page.getByText('Respuesta de los anfitriones')).toBeVisible()
  await expect(page.getByText('Gracias, los esperamos con muchas ganas.')).toBeVisible()
})

