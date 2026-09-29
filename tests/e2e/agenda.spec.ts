import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **La agenda** (29 de septiembre): una cita se agenda desde su día, sale en el mes y en la suscripción
 * `.ics`, que se corta si la persona pierde el acceso; y el invitado guarda el evento en su calendario.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const SLUG = 'agenda-e2e'

test.use({ storageState: AUTH_STATE })
test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await deleteEvent(SLUG)
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('una cita se agenda desde su día, sale en el mes y en la suscripción del teléfono', async ({ page, request }) => {
  const { token } = await seedInvitation({ slug: SLUG, plan: 'alta-costura' })
  await escribirInvitacion(SLUG)

  await page.goto(`/panel/eventos/${SLUG}/planner/agenda?mes=2027-04&dia=2027-04-10&cita=nueva`)
  const dialogo = page.getByRole('dialog', { name: 'Nueva cita' })
  await dialogo.getByLabel('Qué').fill('Degustación del menú')
  await dialogo.getByLabel('Hora').selectOption('16:30')
  await dialogo.getByLabel('Dónde').fill('Catering Sabores, Av. Busch')
  await dialogo.getByRole('button', { name: 'Agendar' }).click()
  await expect(page.locator('dialog[open]')).toHaveCount(0)

  // En la lista del día y en la casilla del mes.
  await expect(page.getByRole('region', { name: /10 abr/ })).toContainText('Degustación del menú')
  await expect(page.getByRole('link', { name: /10 abr, 1 en la agenda/ })).toBeVisible()

  // La suscripción: un enlace privado que el calendario del teléfono lee sin sesión.
  await page.getByRole('button', { name: 'Ver en mi calendario' }).click()
  const abrir = page.getByRole('link', { name: 'Abrir en mi calendario' })
  await expect(abrir).toHaveAttribute('href', /^webcal:\/\/.+\/calendario\/[\w-]+$/)
  const enlace = (await abrir.getAttribute('href'))!.replace(/^webcal:\/\/[^/]+/, '')
  const ics = await request.get(enlace, { headers: { cookie: '' } })
  expect(ics.status()).toBe(200)
  expect(ics.headers()['content-type']).toContain('text/calendar')
  const cuerpo = await ics.text()
  expect(cuerpo).toContain('SUMMARY:Degustación del menú · Cita')
  expect(cuerpo).toContain('DTSTART:20270410T203000Z')
  expect(cuerpo).toContain('LOCATION:Catering Sabores\\, Av. Busch')

  // Pedir otro enlace corta el anterior.
  await page.reload()
  await page.getByRole('button', { name: 'Ver en mi calendario' }).click()
  await expect(page.getByRole('link', { name: 'Abrir en mi calendario' })).toBeVisible()
  expect((await request.get(enlace)).status()).toBe(404)

  // El invitado guarda el evento en su calendario: la hora escrita en la invitación, en UTC.
  const delInvitado = await request.get(`/i/${token}/calendario`)
  expect(delInvitado.status()).toBe(200)
  const evento = await delInvitado.text()
  expect(evento).toContain('DTSTART:20270516T000000Z')
  expect(evento).toContain('LOCATION:Salón Los Ceibos')
  expect((await request.get('/i/no-existe/calendario')).status()).toBe(404)
})
