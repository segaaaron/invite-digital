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

})

// Cierra sesión con una sesión propia: cerrar la compartida por el proyecto `setup`
// dejaría sin cookie válida a todo lo que venga después.
test.describe('cierre de sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('cierra la sesión y el panel vuelve a exigirla', async ({ page }) => {
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(ATELIER.email)
    await page.getByLabel('Contraseña').fill(ATELIER.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/panel$/)

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/panel\/entrar$/)

    await page.goto('/panel')
    await expect(page).toHaveURL(/\/panel\/entrar$/)
  })
})

test.describe('invitados del evento', () => {
  test.use({ storageState: AUTH_STATE })

  const SLUG = 'boda-invitados-e2e'

  test.beforeEach(async ({ page }) => {
    await deleteEvent(SLUG)
    await page.goto('/panel/eventos/nuevo')
    await page.getByLabel('Título').fill('Boda invitados e2e')
    await page.getByLabel('Identificador').fill(SLUG)
    await page.getByLabel('Fecha del evento').fill('2027-05-15')
    await page.getByLabel('Fecha límite de confirmación').fill('2027-05-01')
    await page.getByRole('button', { name: 'Crear evento' }).click()
    await expect(page.getByRole('status')).toContainText('Evento guardado')
  })

  // La conexión de las fixtures es única para todo el archivo: se cierra en el último
  // describe, no en cada uno, o los siguientes se quedan sin base.
  test.afterAll(async () => {
    await deleteEvent(SLUG)
    await closeDb()
  })

  test('crea un grupo, enseña el enlace una sola vez y lo revoca', async ({ page }) => {
    await page.goto(`/panel/eventos/${SLUG}`)

    await page.getByLabel('Grupo invitado').fill('Familia Rojas Peña')
    await page.getByLabel('Cupos').fill('4')
    await page.getByRole('button', { name: 'Crear invitación' }).click()

    const enlace = page.getByLabel('Enlace de la invitación')
    await expect(enlace).toHaveValue(/\/i\/[A-Za-z0-9_-]{22}$/)
    await expect(page.getByRole('status')).toContainText('no podremos volver a mostrarlo')

    // Al recargar, el enlace ya no existe en ninguna parte: solo queda su hash.
    await page.reload()
    await expect(page.getByLabel('Enlace de la invitación')).toHaveCount(0)
    await expect(page.getByText('— / 4')).toBeVisible()

    await page.getByRole('button', { name: 'Revocar' }).click()
    await expect(page.getByText('Revocada')).toBeVisible()
  })

  test('crea el enlace del cliente, se abre en solo lectura y se revoca', async ({ page, context }) => {
    await page.goto(`/panel/eventos/${SLUG}`)

    await page.getByLabel('Grupo invitado').fill('Familia Rojas Peña')
    await page.getByLabel('Cupos').fill('4')
    await page.getByRole('button', { name: 'Crear invitación' }).click()
    await expect(page.getByLabel('Enlace de la invitación')).toBeVisible()

    await page.getByRole('button', { name: 'Crear enlace para el cliente' }).click()
    const url = await page.getByLabel('Enlace para el cliente').inputValue()
    expect(url).toMatch(/\/compartir\/[A-Za-z0-9_-]{22}$/)

    // Sin sesión: el cliente no es del atelier.
    const anonima = await context.browser()!.newContext()
    const vista = await anonima.newPage()
    await vista.goto(url)
    await expect(vista.getByText('Familia Rojas Peña')).toBeVisible()
    await expect(vista.getByRole('button', { name: 'Revocar' })).toHaveCount(0)

    await page.reload()
    await page.getByRole('button', { name: 'Revocar enlace' }).click()
    await expect(page.getByRole('button', { name: 'Crear enlace para el cliente' })).toBeVisible()

    expect((await vista.goto(url))?.status()).toBe(404)
    await anonima.close()
  })

  test('el navegador no deja enviar un grupo de cero cupos', async ({ page }) => {
    await page.goto(`/panel/eventos/${SLUG}`)
    await page.getByLabel('Grupo invitado').fill('Grupo vacío')
    await page.getByLabel('Cupos').fill('0')
    await page.getByRole('button', { name: 'Crear invitación' }).click()

    // `min={1}` corta el envío en el navegador; el dominio vuelve a rechazarlo si
    // alguien llama a la acción por su cuenta (cubierto en las pruebas de aplicación).
    await expect(page.getByLabel('Cupos')).toHaveJSProperty('validity.rangeUnderflow', true)
    await expect(page.getByLabel('Enlace de la invitación')).toHaveCount(0)
  })
})
