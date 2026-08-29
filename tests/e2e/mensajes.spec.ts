import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeGuestbookDb, deleteGuestbookEvent, noteOf, seedGuestbookEvent } from './fixtures/mensajes'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-mensajes-e2e'

test.afterAll(async () => {
  await deleteGuestbookEvent(SLUG)
  await closeGuestbookDb()
})

test('el invitado firma el libro, el atelier lo lee y le responde, y él ve la respuesta', async ({ page }) => {
  const { eventId, token } = await seedGuestbookEvent(SLUG)

  // 1. El invitado confirma **con un mensaje**. El texto no vuelve a escribirse en
  //    ninguna tabla nueva: se queda en `rsvp_responses.message`, donde ya vivía.
  await page.goto(`/i/${token}`)
  await page.getByLabel('¿Cuántos asisten?').selectOption('3')
  await page.getByLabel('Mensaje para los anfitriones (opcional)').fill('Qué ganas de celebrar con ustedes.')
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(page.getByRole('status')).toContainText('Gracias')

  // 2. El evento anuncia el mensaje sin leer desde su propia página, sin entrar.
  await page.goto(`/panel/eventos/${SLUG}`)
  await expect(page.getByRole('link', { name: /Mensajes\s*1 sin leer/ })).toBeVisible()

  // 3. La bandeja lo muestra sin leer. Recién escrito no tiene nota todavía: si la
  //    consulta uniera con `innerJoin`, aquí no habría nada que ver.
  await page.getByRole('link', { name: /Mensajes/ }).click()
  await expect(page.getByText('Qué ganas de celebrar con ustedes.')).toBeVisible()
  // `exact` y el `span`: «Sin leer» también es el nombre del filtro, que lleva su cuenta
  // pegada («Sin leer 1»). Lo que se comprueba aquí es la insignia de la tarjeta.
  await expect(page.getByText('Sin leer', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Sin leer/ })).toHaveText(/1/)

  // 4. Marcado leído, el contador baja.
  await page.getByRole('button', { name: 'Marcar leído' }).click()
  await expect(page.getByRole('button', { name: /^Sin leer/ })).toHaveText(/0/)
  await expect(page.getByText('Sin leer', { exact: true })).toBeHidden()

  // 5. El atelier responde, y la respuesta llega a la base. Responder va plegado tras su
  // botón: la maqueta solo enseña «Marcar leído» y «Destacar» en la tarjeta.
  await page.getByText('Responder', { exact: true }).first().click()
  await page.getByLabel('Responder a Familia Rojas Peña').fill('Gracias, los esperamos con muchas ganas.')
  await page.getByRole('button', { name: 'Responder' }).click()
  await expect(page.getByText('Tu respuesta')).toBeVisible()

  await expect
    .poll(async () => (await noteOf(eventId))?.reply)
    .toBe('Gracias, los esperamos con muchas ganas.')

  // 6. El invitado recarga su enlace y ve la respuesta.
  await page.goto(`/i/${token}`)
  await expect(page.getByText('Respuesta de los anfitriones')).toBeVisible()
  await expect(page.getByText('Gracias, los esperamos con muchas ganas.')).toBeVisible()
})

test('lo destacado en el panel es lo que ve la pareja en su enlace de solo lectura', async ({ page }) => {
  const slug = `${SLUG}-destacados`
  const { token } = await seedGuestbookEvent(slug)

  await page.goto(`/i/${token}`)
  await page.getByLabel('¿Cuántos asisten?').selectOption('2')
  await page.getByLabel('Mensaje para los anfitriones (opcional)').fill('Un abrazo enorme para los dos.')
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(page.getByRole('status')).toContainText('Gracias')

  await page.goto(`/panel/eventos/${slug}/mensajes`)
  await page.getByRole('button', { name: 'Destacar' }).click()
  await expect(page.getByRole('button', { name: 'Quitar destacado' })).toBeVisible()

  // El enlace del cliente se crea desde la página del evento y se muestra una sola vez.
  // El enlace del cliente vive en Configuración, que es una vista propia como en la maqueta.
  await page.goto(`/panel/eventos/${slug}/configuracion`)
  await page.getByRole('button', { name: 'Crear enlace para el cliente' }).click()
  const enlace = await page.getByLabel('Enlace para el cliente').inputValue()

  await page.goto(new URL(enlace).pathname)
  await expect(page.getByRole('heading', { name: 'Mensajes destacados' })).toBeVisible()
  await expect(page.getByText('Un abrazo enorme para los dos.')).toBeVisible()

  await deleteGuestbookEvent(slug)
})
