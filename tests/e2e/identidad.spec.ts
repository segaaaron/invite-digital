import { expect, test } from '@playwright/test'
import { borrar, cerrarDb, debeCambiarla, NUEVA_PASSWORD, PROVISIONAL, seedCodigo, seedProvisional } from './fixtures/identidad'

/**
 * La contraseña provisional y la recuperación con código.
 *
 * Lo que esta suite vigila es que el panel **no se abra** mientras la contraseña la haya
 * escrito otro: la que el admin teclea al dar de alta viaja por correo, y quien la
 * escribió podría entrar como el cliente.
 *
 * Va en serie y con pocos inicios de sesión a propósito: son tres por cuenta y minuto, y
 * cinco por IP. Repartirlos sin contarlos tumba esta suite y las vecinas.
 */
test.describe.configure({ mode: 'serial' })

test.describe('la contraseña provisional', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeAll(async () => {
    await seedProvisional()
  })

  test.afterAll(async () => {
    await borrar()
    await cerrarDb()
  })

  test('entrar con ella lleva a cambiarla, y el panel no se abre', async ({ page }) => {
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(PROVISIONAL.email)
    await page.getByLabel('Contraseña').fill(PROVISIONAL.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // Directo a cambiarla, sin pasar por el resumen.
    await expect(page).toHaveURL(/\/panel\/cuenta$/)
    await expect(page.getByText(/Elige tu contraseña antes de seguir/)).toBeVisible()

    // Y el resto del panel devuelve aquí mismo mientras siga provisional: esto es el
    // corte de verdad, no el aviso de la pantalla.
    await page.goto('/panel')
    await expect(page).toHaveURL(/\/panel\/cuenta$/)
  })

  test('al cambiarla se abre el panel, y la marca se apaga', async ({ page }) => {
    // Sigue la sesión del test anterior: `mode: 'serial'` comparte contexto.
    await page.goto('/panel/cuenta')
    await page.getByLabel('Contraseña actual').fill(PROVISIONAL.password)
    await page.getByLabel('Contraseña nueva').fill(NUEVA_PASSWORD)
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    // Cambiarla cierra todas las sesiones —incluida esta—, así que devuelve a la puerta.
    await expect(page).toHaveURL(/\/panel\/entrar/)
    expect(await debeCambiarla()).toBe(false)

    // Y ahora sí entra al panel con la suya.
    await page.getByLabel('Correo').fill(PROVISIONAL.email)
    await page.getByLabel('Contraseña').fill(NUEVA_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+)?$/)
  })
})

test.describe('recuperar la contraseña con código', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.afterAll(async () => {
    await borrar()
    await cerrarDb()
  })

  test('la pantalla existe y no dice si el correo tiene cuenta', async ({ page }) => {
    await seedProvisional()
    await page.goto('/panel/recuperar')

    await page.getByLabel('Tu correo').fill('no-existe-nadie-asi@invitepremium.bo')
    await page.getByRole('button', { name: /Enviarme un código/ }).click()

    // La misma respuesta exista o no: lo contrario convertiría esto en una forma de
    // averiguar quién es cliente del atelier.
    await expect(page.getByText(/Si ese correo tiene cuenta/)).toBeVisible()
  })

  test('con el código correcto se cambia la contraseña', async ({ page }) => {
    // El código lo elige la prueba y siembra su hash: en la base solo vive el SHA-256, así
    // que no hay forma de «leerlo» ni abriendo la tabla.
    await seedCodigo('424242')

    await page.goto('/panel/recuperar')
    await page.getByLabel('Tu correo').fill(PROVISIONAL.email)
    await page.getByRole('button', { name: /Enviarme un código/ }).click()
    await expect(page.getByText(/Si ese correo tiene cuenta/)).toBeVisible()

    // Pedirlo invalida el anterior, así que se vuelve a sembrar el que conocemos.
    await seedCodigo('424242')
    await page.getByLabel('Código del correo').fill('424242')
    await page.getByLabel('Contraseña nueva').fill('recuperada-por-codigo-1')
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    await expect(page.getByText(/Contraseña cambiada/)).toBeVisible()

    // Y sirve para entrar.
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(PROVISIONAL.email)
    await page.getByLabel('Contraseña').fill('recuperada-por-codigo-1')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+)?$/)
  })

  test('un código equivocado no cambia nada', async ({ page }) => {
    await seedCodigo('111111')

    await page.goto('/panel/recuperar')
    await page.getByLabel('Tu correo').fill(PROVISIONAL.email)
    await page.getByRole('button', { name: /Enviarme un código/ }).click()
    await seedCodigo('111111')

    await page.getByLabel('Código del correo').fill('999999')
    await page.getByLabel('Contraseña nueva').fill('no-deberia-aplicarse-1')
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    await expect(page.getByRole('alert')).toContainText(/no es válido|caducó|ya se usó/i)
  })
})
