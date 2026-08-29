import { expect, test } from '@playwright/test'
import { invitationFixtures } from './fixtures/invitation'

const { closeInvitationDb, countResponses, deleteEvent, seedInvitation } = invitationFixtures()

// Las páginas de invitado no llevan sesión del atelier.
test.use({ storageState: { cookies: [], origins: [] } })

test.afterAll(async () => {
  await closeInvitationDb()
})

test('el invitado confirma 3 de 4 cupos y luego cambia a 2', async ({ page }) => {
  const { token, groupId, eventSlug } = await seedInvitation({ slug: 'boda-rsvp-e2e' })

  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Evento boda-rsvp-e2e')

  // El nombre llega prellenado con la etiqueta del grupo: el enlace es del grupo y quien
  // contesta es una persona de dentro.
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Familia Rojas Peña')
  await page.getByLabel('Nombre completo').fill('Jorge Rojas')
  await page.getByLabel('¿Cuántos asisten?').selectOption('3')
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  // El diseño saluda por su nombre a quien acaba de confirmar.
  await expect(page.getByRole('status')).toContainText('¡Gracias, Jorge Rojas!')

  await page.getByRole('button', { name: 'Cambiar mi respuesta' }).click()
  await expect(page.getByLabel('¿Cuántos asisten?')).toHaveValue('3')
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Jorge Rojas')

  await page.getByLabel('¿Cuántos asisten?').selectOption('2')
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(page.getByRole('status')).toContainText('Gracias')

  // El histórico es de solo anexado: dos respuestas, no una actualizada.
  expect(await countResponses(groupId)).toBe(2)

  await page.reload()
  await expect(page.getByLabel('¿Cuántos asisten?')).toHaveValue('2')

  await deleteEvent(eventSlug)
})

test('un token inválido da 404', async ({ page }) => {
  expect((await page.goto('/i/tokenquenoexiste1234'))?.status()).toBe(404)
})

test('una invitación revocada da 404, igual que una inexistente', async ({ page }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-revocada-e2e', revoked: true })
  expect((await page.goto(`/i/${token}`))?.status()).toBe(404)
  await deleteEvent(eventSlug)
})

test('un evento en borrador no tiene invitación todavía', async ({ page }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-borrador-e2e', status: 'draft' })
  expect((await page.goto(`/i/${token}`))?.status()).toBe(404)
  await deleteEvent(eventSlug)
})

test('pasado el plazo se muestra la invitación sin formulario', async ({ page }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-cerrada-e2e', rsvpDeadline: '2020-01-01' })

  await page.goto(`/i/${token}`)
  await expect(page.getByText('El plazo para confirmar ya cerró')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ENVIAR' })).toHaveCount(0)

  await deleteEvent(eventSlug)
})

test('la invitación se sirve en el idioma del evento, no en el del navegador', async ({ browser }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-idioma-e2e', locale: 'en' })

  const context = await browser.newContext({ extraHTTPHeaders: { 'Accept-Language': 'es-BO,es;q=0.9' } })
  const page = await context.newPage()
  await page.goto(`/i/${token}`)

  await expect(page.getByLabel('How many are coming?')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await context.close()
  await deleteEvent(eventSlug)
})

test('la página del invitado no se indexa', async ({ page, request }) => {
  const { token, eventSlug } = await seedInvitation({ slug: 'boda-noindex-e2e' })

  await page.goto(`/i/${token}`)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('/i/')

  await deleteEvent(eventSlug)
})

test('el pase vive a solas, a un toque de la invitación', async ({ page }) => {
  const { token } = await seedInvitation({ slug: 'boda-pase-e2e' })

  // En la puerta, de noche y con gente detrás, nadie se desplaza hasta el final de la
  // invitación: se abre esta pantalla y se enseña.
  await page.goto(`/i/${token}`)
  await page.getByRole('link', { name: 'Abrir mi pase' }).click()

  await expect(page).toHaveURL(new RegExp(`/i/${token}/pase$`))
  await expect(page.getByRole('img')).toBeVisible()
  await expect(page.getByText(/Mesa por asignar|Mesa \d+/)).toBeVisible()
  await expect(page.getByText(/Guarda esta pantalla/)).toBeVisible()

  // Y no se indexa: es de una persona y de una noche.
  const html = await page.content()
  expect(html).toContain('noindex')

  await page.getByRole('link', { name: 'Volver a la invitación' }).click()
  await expect(page).toHaveURL(new RegExp(`/i/${token}$`))

  await deleteEvent('boda-pase-e2e')
})
