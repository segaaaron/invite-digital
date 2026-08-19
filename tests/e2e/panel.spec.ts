import { expect, test } from '@playwright/test'

// El usuario del atelier se crea con `pnpm user:create`; estas credenciales son las de
// la base de desarrollo. En CI, el paso previo las siembra igual.
const EMAIL = 'atelier@invitepremium.bo'
const PASSWORD = 'contrasena-de-prueba-1'

test('el panel exige sesión', async ({ page }) => {
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/entrar$/)
})

test('una contraseña incorrecta no abre sesión', async ({ page }) => {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(EMAIL)
  await page.getByLabel('Contraseña').fill('esta-no-es-la-buena')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('incorrectos')
  await expect(page).toHaveURL(/\/panel\/entrar$/)
})

test('entra, mantiene la sesión al recargar y sale', async ({ page }) => {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/panel$/)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible()

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/panel\/entrar$/)

  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/entrar$/)
})
