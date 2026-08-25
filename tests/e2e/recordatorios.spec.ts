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

  await page.goto(`/panel/eventos/${SLUG}/invitados`)

  const cola = page.locator('section', { has: page.getByRole('heading', { name: 'Recordatorios' }) })
  const fila = cola.getByRole('listitem').filter({ hasText: 'Familia Rojas Peña' })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText('Sin responder')

  // El enlace de WhatsApp lleva el mensaje escrito y NUNCA el enlace de la invitación:
  // de ese token la base guarda solo su SHA-256.
  const href = await fila.getByRole('link', { name: /whatsapp/i }).getAttribute('href')
  expect(href).toContain('wa.me/59170011122')
  expect(decodeURIComponent(href ?? '')).not.toMatch(/\/i\/[A-Za-z0-9_-]{22}/)

  // Al anotarlo, la acción revalida y la fila desaparece sola: la espera entre
  // recordatorios lo saca de la cola. No hace falta recargar a mano.
  // Sin nadie a quien recordar, la tarjeta **desaparece entera**: una permanente que casi
  // siempre dice «nadie por recordar hoy» es un hueco fijo que se deja de mirar justo el
  // día que sí trae a alguien.
  await fila.getByRole('button', { name: 'Marcar recordado' }).click()
  await expect(cola).toHaveCount(0)
})
