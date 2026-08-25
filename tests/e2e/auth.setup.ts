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
  // Entrar cae en el resumen del evento activo; sin ningún evento, en la bandeja.
  await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+)?$/)

  await page.context().storageState({ path: AUTH_STATE })
})
