import { expect, test } from '@playwright/test'
import { invitationFixtures } from './fixtures/invitation'

const { attendanceByPerson, attendingOf, closeInvitationDb, countResponses, deleteEvent, reopenRsvp, seedInvitation } = invitationFixtures()

// Las páginas de invitado no llevan sesión del atelier.
test.use({ storageState: { cookies: [], origins: [] } })

test.afterAll(async () => {
  await closeInvitationDb()
})

test('una familia confirma nombre por nombre, y solo una vez', async ({ page }) => {
  const { token, groupId, eventSlug } = await seedInvitation({
    slug: 'boda-rsvp-personas-e2e',
    people: ['Ana Rojas', 'Luis Peña', 'Mateo Peña'],
  })

  // Con tres personas cargadas, la invitación no pregunta «cuántos»: manda a decir quiénes.
  await page.goto(`/i/${token}`)
  await page.getByRole('link', { name: 'Confirmar asistencia' }).click()
  await expect(page).toHaveURL(new RegExp(`/i/${token}/confirmar$`))

  const deAna = page.locator('div').filter({ hasText: /^Ana Rojas/ }).last()
  await deAna.getByRole('button', { name: 'ASISTIRÉ' }).click()
  const deMateo = page.locator('div').filter({ hasText: /^Mateo Peña/ }).last()
  await deMateo.getByRole('button', { name: 'ASISTIRÉ' }).click()

  await expect(page.getByText('Vienen 2 de 4')).toBeVisible()
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  // Al guardar, el servidor revalida y la pantalla pasa al resumen: ya no hay formulario.
  await expect(page.getByRole('status')).toContainText('Vienen 2 de 4')

  // Queda **quién** viene, que es lo que necesitan las mesas y el catering.
  expect(await attendingOf(groupId)).toBe(2)
  expect(await attendanceByPerson(groupId)).toEqual({ 'Ana Rojas': 'yes', 'Luis Peña': 'no', 'Mateo Peña': 'yes' })

  // Y no se puede volver a contestar: el enlace pasa a ser el resumen.
  await page.goto(`/i/${token}/confirmar`)
  await expect(page.getByText('Confirmación enviada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ENVIAR' })).toHaveCount(0)
  expect(await countResponses(groupId)).toBe(1)

  // Salvo que el atelier lo reabra desde el panel, y entonces vale **una** vez más.
  await reopenRsvp(groupId)
  await page.goto(`/i/${token}/confirmar`)
  await page.locator('div').filter({ hasText: /^Luis Peña/ }).last().getByRole('button', { name: 'ASISTIRÉ' }).click()
  await page.getByRole('button', { name: 'ENVIAR' }).click()
  await expect(page.getByRole('status')).toContainText('Vienen 1 de 4')
  expect(await countResponses(groupId)).toBe(2)
  expect(await attendingOf(groupId)).toBe(1)

  await deleteEvent(eventSlug)
})

test('una pareja confirma de un toque, sin pasar por la lista de nombres', async ({ page }) => {
  const { token, groupId, eventSlug } = await seedInvitation({
    slug: 'boda-rsvp-pareja-e2e',
    seats: 2,
    people: ['Carla Méndez', 'Diego Salas'],
  })

  await page.goto(`/i/${token}`)
  await page.getByRole('button', { name: 'Asistiremos los dos' }).click()
  await expect(page.getByRole('status')).toContainText('Vienen 2 de 2')

  expect(await attendingOf(groupId)).toBe(2)
  expect(await attendanceByPerson(groupId)).toEqual({ 'Carla Méndez': 'yes', 'Diego Salas': 'yes' })

  await deleteEvent(eventSlug)
})
