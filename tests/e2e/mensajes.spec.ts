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

  // 1. El invitado confirma y luego firma el libro (V4: el mensaje ya no va en la confirmación).
  //    Antes de confirmar no se firma: firmar guardaba una respuesta con todos los lugares. El
  //    texto no vuelve a escribirse en ninguna tabla nueva: se queda en `rsvp_responses.message`.
  await page.goto(`/i/${token}`)
  await expect(page.getByText('Confirma tu asistencia y podrás dejar tus deseos')).toBeVisible()
  await page.getByRole('button', { name: 'ENVIAR', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Confirmación enviada' })).toBeVisible()
  await page.getByLabel('Deja unas palabras…').fill('Qué ganas de celebrar con ustedes.')
  await page.getByRole('button', { name: 'ENVIAR MIS DESEOS' }).click()
  // Se espera a que el libro deje de pedir el mensaje: «Te esperamos» ya lo decía la confirmación de
  // arriba, así que esperar ese texto no esperaba a la firma y el panel se abría antes de que existiera.
  await expect(page.getByLabel('Deja unas palabras…')).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Te esperamos' }).first()).toBeVisible()

  // 2. El libro de firmas lo muestra: sin «leído» ni «destacado», solo las palabras y quién las dejó.
  await page.goto(`/panel/eventos/${SLUG}/mensajes`)
  await expect(page.getByText('Qué ganas de celebrar con ustedes.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Marcar leído|Destacar/ })).toHaveCount(0)
  // Dice si viene, y cuántas quedan por agradecer.
  await expect(page.getByText(/^Vienen? /).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sin agradecer · 1' })).toBeVisible()

  // 3. Se le agradece, y la respuesta llega a la base.
  await page.getByRole('button', { name: 'Agradecer' }).first().click()
  await page.getByLabel(/^Agradecer a /).fill('Gracias, los esperamos con muchas ganas.')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Tu agradecimiento')).toBeVisible()

  await expect
    .poll(async () => (await noteOf(eventId))?.reply)
    .toBe('Gracias, los esperamos con muchas ganas.')

  // Agradecida, sale del filtro «Sin agradecer».
  await page.goto(`/panel/eventos/${SLUG}/mensajes?filtro=sin-agradecer`)
  await expect(page.getByText('Nada por agradecer')).toBeVisible()

  // 4. El invitado recarga su enlace y ve la respuesta.
  await page.goto(`/i/${token}`)
  await expect(page.getByText('Respuesta de los anfitriones')).toBeVisible()
  await expect(page.getByText('Gracias, los esperamos con muchas ganas.')).toBeVisible()
})

