import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeRecordatorioDb, deleteRecordatorioEvent, seedRecordatorioEvent } from './fixtures/recordatorios'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-recordatorios-e2e'

test.afterAll(async () => {
  await deleteRecordatorioEvent(SLUG)
  await closeRecordatorioDb()
})

test('el grupo sin contestar sale en la cola, se marca recordado y deja de salir', async ({ page }) => {
  await seedRecordatorioEvent(SLUG)

  // La cola es el diálogo «Recordar» (E55), que abre el botón de cada fila.
  await page.goto(`/dashboard/events/${SLUG}/guests?panel=recordar`)

  const cola = page.getByRole('dialog')
  const fila = cola.getByRole('listitem').filter({ hasText: 'Familia Rojas Peña' })
  await expect(fila).toBeVisible()
  // El motivo va en el título de su grupo, una vez (9 oct).
  await expect(cola.getByRole('heading', { name: /abrieron y no confirmaron/i })).toBeVisible()

  // El enlace de WhatsApp lleva el mensaje escrito y NUNCA el enlace de la invitación:
  // de ese token la base guarda solo su SHA-256.
  const href = await fila.getByRole('link', { name: /whatsapp/i }).getAttribute('href')
  expect(href).toContain('wa.me/59170011122')
  expect(decodeURIComponent(href ?? '')).not.toMatch(/\/i\/[A-Za-z0-9_-]{22}/)

  // Al anotarlo, la acción revalida y la fila desaparece sola: la espera entre
  // recordatorios lo saca de la cola. No hace falta recargar a mano.
  await fila.getByRole('button', { name: /ya le avisé/i }).click()
  await expect(cola.getByText(/nadie por recordar/i)).toBeVisible()
})
