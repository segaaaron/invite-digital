import { expect, test } from '@playwright/test'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'
import { closeDb, deleteEvent } from './fixtures/db'

test.describe('sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('el panel exige sesión', async ({ page }) => {
    await page.goto('/panel')
    await expect(page).toHaveURL(/\/panel\/entrar$/)
  })

  test('una contraseña incorrecta no abre sesión', async ({ page }) => {
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(ATELIER.email)
    await page.getByLabel('Contraseña').fill('esta-no-es-la-buena')
    await page.getByRole('button', { name: 'Entrar' }).click()
    // Acotado al formulario: Next monta su propio anunciador de rutas con role="alert".
    await expect(page.locator('form').getByRole('alert')).toContainText('incorrectos')
    await expect(page).toHaveURL(/\/panel\/entrar$/)
  })
})

test.describe('con sesión', () => {
  test.use({ storageState: AUTH_STATE })

  const SLUG = 'boda-e2e'

  test.beforeEach(async () => {
    await deleteEvent(SLUG)
  })

  test.afterAll(async () => {
    await deleteEvent(SLUG)
    await closeDb()
  })

  test('la sesión sobrevive a la recarga', async ({ page }) => {
    await page.goto('/panel')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible()
  })

  test('crea un evento y lo muestra en la bandeja', async ({ page }) => {
    await page.goto('/panel/eventos/nuevo')

    await page.getByLabel('Título').fill('Boda e2e')
    await page.getByLabel('Identificador').fill(SLUG)
    await page.getByLabel('Fecha del evento').fill('2027-05-15')
    await page.getByLabel('Fecha límite de confirmación').fill('2027-05-01')
    await page.getByRole('button', { name: 'Crear evento' }).click()
    await expect(page.getByRole('status')).toContainText('Evento guardado')

    await page.goto('/panel')
    await expect(page.getByRole('link', { name: /Boda e2e/ })).toBeVisible()
  })

  test('rechaza una fecha límite posterior al evento', async ({ page }) => {
    await page.goto('/panel/eventos/nuevo')

    await page.getByLabel('Título').fill('Boda inválida')
    await page.getByLabel('Identificador').fill(SLUG)
    await page.getByLabel('Fecha del evento').fill('2027-05-15')
    await page.getByLabel('Fecha límite de confirmación').fill('2027-06-01')
    await page.getByRole('button', { name: 'Crear evento' }).click()

    await expect(page.locator('form').getByRole('alert')).toContainText('no puede ser posterior')
  })

  test('cierra la sesión y el panel vuelve a exigirla', async ({ page }) => {
    await page.goto('/panel')
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/panel\/entrar$/)

    await page.goto('/panel')
    await expect(page).toHaveURL(/\/panel\/entrar$/)
  })
})
