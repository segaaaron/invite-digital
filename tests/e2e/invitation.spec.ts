import { expect, test } from '@playwright/test'
import { closeInvitationDb, countResponses, deleteEvent, seedInvitation } from './fixtures/invitation'

// Las páginas de invitado no llevan sesión del atelier.
test.use({ storageState: { cookies: [], origins: [] } })

test.afterAll(async () => {
  await closeInvitationDb()
})

test('el invitado confirma 3 de 4 cupos y luego cambia a 2', async ({ page }) => {
  const { token, groupId, eventSlug } = await seedInvitation({ slug: 'boda-rsvp-e2e' })

  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Evento boda-rsvp-e2e')

  await page.getByLabel('¿Cuántos asisten?').selectOption('3')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('status')).toContainText('Confirmación recibida')

  await page.getByRole('button', { name: 'Cambiar mi respuesta' }).click()
  await expect(page.getByLabel('¿Cuántos asisten?')).toHaveValue('3')

  await page.getByLabel('¿Cuántos asisten?').selectOption('2')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('status')).toContainText('Confirmación recibida')

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
  await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0)

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
