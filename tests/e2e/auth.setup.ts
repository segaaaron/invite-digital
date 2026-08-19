import { expect, test as setup } from '@playwright/test'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'

/**
 * Inicia sesión una sola vez por ejecución y guarda la cookie. Repetirlo por prueba
 * chocaría con el limitador de intentos por cuenta —tres por minuto—, que es
 * exactamente lo que debe hacer.
 */
setup('sesión del atelier', async ({ page }) => {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(ATELIER.email)
  await page.getByLabel('Contraseña').fill(ATELIER.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/panel$/)

  await page.context().storageState({ path: AUTH_STATE })
})
