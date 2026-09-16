import { expect, test } from '@playwright/test'
import { invitationFixtures } from './fixtures/invitation'

const { attendingOf, closeInvitationDb, countResponses, deleteEvent, seedInvitation } = invitationFixtures()

// Las páginas de invitado no llevan sesión del atelier.
test.use({ storageState: { cookies: [], origins: [] } })

test.afterAll(async () => {
  await closeInvitationDb()
})

test('el invitado confirma sin escribir su nombre, y su enlace pasa a ser el resumen', async ({ page }) => {
  const { token, groupId, eventSlug } = await seedInvitation({ slug: 'boda-rsvp-e2e' })

  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Evento boda-rsvp-e2e')

  // No se pide el nombre: el enlace es de un invitado y responde con el suyo.
  await expect(page.getByLabel('Nombre completo')).toHaveCount(0)
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  // Saluda por su nombre, dice que se envió y no ofrece modificarla.
  const hecho = page.getByRole('status')
  await expect(hecho).toContainText('¡Gracias, Familia Rojas Peña!')
  await expect(hecho).toContainText('Confirmación enviada')
  await expect(page.getByRole('button', { name: /cambiar/i })).toHaveCount(0)

  // Se confirma **una sola vez**: el enlace acaba en el chat de toda la familia, y con el
  // formulario abierto cualquiera podría cambiar lo que dijeron los demás. Al volver a abrirlo
  // lo que hay es el resumen.
  await page.goto(`/i/${token}`)
  await expect(page.getByText('Confirmación enviada')).toBeVisible()
  await expect(page.getByLabel('Nombre completo')).toHaveCount(0)

  expect(await countResponses(groupId)).toBe(1)

  // Cuántos vienen no se pregunta —el diseño no lo pregunta—, pero se manda: son los cupos
  // del grupo, y con ellos se hacen el catering, las mesas y la puerta.
  expect(await attendingOf(groupId)).toBe(4)

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

  // «How many are coming?» ya no existe: el formulario dejó de preguntarlo, como la maqueta.
  await expect(page.getByLabel('Full name')).toBeVisible()
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

  // Sin confirmar no hay pase: la pantalla lo dice y no enseña ningún QR.
  await page.goto(`/i/${token}/pase`)
  await expect(page.getByText(/aparecerá aquí en cuanto confirmes/)).toBeVisible()
  await expect(page.getByRole('img')).toHaveCount(0)

  // Al confirmar que asiste, el pase se entrega en el acto.
  await page.goto(`/i/${token}`)
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(page.getByRole('status')).toContainText('Confirmación enviada')

  // En la puerta, de noche y con gente detrás, nadie se desplaza hasta el final de la
  // invitación: se abre esta pantalla y se enseña.
  await page.getByRole('link', { name: 'Abrir mi pase' }).first().click()

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
