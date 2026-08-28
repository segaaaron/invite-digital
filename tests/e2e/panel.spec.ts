import { expect, test } from '@playwright/test'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'
import { closeDb, deleteEvent } from './fixtures/db'
import { createEvent, signIn } from './helpers/panel'

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
    await signIn(page)

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/panel\/entrar$/)

    await page.goto('/panel')
    await expect(page).toHaveURL(/\/panel\/entrar$/)
  })
})

test.describe('contenido de la invitación', () => {
  test.use({ storageState: AUTH_STATE })

  const SLUG = 'boda-contenido-e2e'

  test.beforeEach(async ({ page }) => {
    await deleteEvent(SLUG)
    await createEvent(page, { slug: SLUG, title: 'Boda contenido e2e' })
  })

  test.afterAll(async () => {
    await deleteEvent(SLUG)
  })

  test('el contenido se edita campo a campo y lo guardado sobrevive a recargar', async ({ page }) => {
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)

    // El diseño por defecto no lleva contenido editable: es el título, la fecha y el
    // lugar. El itinerario y la canción llegan al elegir uno de los dieciséis.
    // El radio va `sr-only`: la tarjeta que se ve es el papel del diseño, y el control
    // de verdad está debajo para que el formulario funcione con teclado y sin JavaScript.
    await page.getByRole('radio', { name: /Botánica/ }).check({ force: true })
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('heading', { name: 'Itinerario' })).toBeVisible()

    // La canción, por su campo. El JSON lo compone la pantalla: nadie escribe una llave.
    const cancion = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Canción' }) })
    await cancion.getByLabel('Canción', { exact: true }).fill('Perfect')
    await cancion.getByRole('button', { name: 'Guardar' }).click()
    await expect(cancion.getByRole('status')).toContainText('Guardado')

    await page.reload()
    await expect(page.getByLabel('Canción', { exact: true })).toHaveValue('Perfect')
  })

  test('una fila quitada del itinerario no vuelve sola al recargar', async ({ page }) => {
    // Es el fallo que encontró el QA de la colección: el contenido se fusionaba con la
    // muestra del diseño en cada lectura, así que quitar algo no servía de nada.
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    // El radio va `sr-only`: la tarjeta que se ve es el papel del diseño, y el control
    // de verdad está debajo para que el formulario funcione con teclado y sin JavaScript.
    await page.getByRole('radio', { name: /Botánica/ }).check({ force: true })
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    const itinerario = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Itinerario' }) })
    const primera = await itinerario.getByLabel('Qué pasa · momento 1').inputValue()

    await itinerario.getByRole('button', { name: 'Quitar momento 1' }).click()
    await itinerario.getByRole('button', { name: 'Guardar' }).click()
    await expect(itinerario.getByRole('status')).toContainText('Guardado')

    await page.reload()
    await expect(page.getByLabel('Qué pasa · momento 1')).not.toHaveValue(primera)
  })
})

test.describe('invitados del evento', () => {
  test.use({ storageState: AUTH_STATE })

  const SLUG = 'boda-invitados-e2e'

  test.beforeEach(async ({ page }) => {
    await deleteEvent(SLUG)
    await createEvent(page, { slug: SLUG, title: 'Boda invitados e2e' })
  })

  // La conexión de las fixtures es única para todo el archivo: se cierra en el último
  // describe, no en cada uno, o los siguientes se quedan sin base.
  test.afterAll(async () => {
    await deleteEvent(SLUG)
    await closeDb()
  })

  test('crea un grupo, enseña el enlace una sola vez y lo revoca', async ({ page }) => {
    await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)

    // El alta es el diálogo de la maqueta: un grupo nace con su primer invitado y sus
    // acompañantes, que son los cupos de más.
    await page.getByLabel('Nombre completo').fill('Familia Rojas Peña')
    await page.getByLabel('Grupo', { exact: true }).selectOption('')
    await page.getByLabel('Nombre del grupo nuevo').fill('Familia Rojas Peña')
    await page.getByLabel('Acompañantes').fill('3')
    await page.getByRole('button', { name: 'Guardar' }).click()

    const enlace = page.getByLabel('Enlace de la invitación')
    await expect(enlace).toHaveValue(/\/i\/[A-Za-z0-9_-]{22}$/)
    await expect(page.getByRole('status')).toContainText('no se vuelve a mostrar')

    // El diálogo se queda abierto mientras hay enlace que copiar; lo cierra quien lo copió.
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
    // Cerrar quita el parámetro de la dirección; sin esperarlo, recargar reabriría el
    // diálogo y taparía la tabla.
    await expect(page).toHaveURL(/invitados$/)

    // Al recargar, el enlace ya no existe en ninguna parte: solo queda su hash.
    await page.reload()
    await expect(page.getByLabel('Enlace de la invitación')).toHaveCount(0)

    // Los cupos y «Revocar» son del **grupo**, que es la otra vista de la misma tarjeta.
    await page.goto(`/panel/eventos/${SLUG}/invitados?vista=grupos`)
    await expect(page.getByText('— / 4')).toBeVisible()

    // La fila del grupo recién creado, no cualquier «Revocar» de la página.
    const fila = page.getByRole('row').filter({ hasText: 'Familia Rojas Peña' }).last()
    await fila.getByRole('button', { name: 'Revocar' }).click()
    // La fila de la tabla; el panel de reparto también dice «Revocada» en su tarjeta.
    await expect(page.getByRole('cell', { name: 'Revocada' })).toBeVisible()
  })

  test('crea el enlace del cliente, se abre en solo lectura y se revoca', async ({ page, context }) => {
    await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)

    await page.getByLabel('Nombre completo').fill('Familia Rojas Peña')
    await page.getByLabel('Grupo', { exact: true }).selectOption('')
    await page.getByLabel('Nombre del grupo nuevo').fill('Familia Rojas Peña')
    await page.getByLabel('Acompañantes').fill('3')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByLabel('Enlace de la invitación')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

    // El enlace del cliente vive en Configuración, que es una vista propia como en la maqueta.
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)

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

  test('un invitado sin nombre no se envía: el navegador lo corta', async ({ page }) => {
    await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)
    await page.getByRole('button', { name: 'Guardar' }).click()

    // `required` corta el envío en el navegador; el dominio vuelve a rechazarlo si
    // alguien llama a la acción por su cuenta (cubierto en las pruebas de aplicación).
    await expect(page.getByLabel('Nombre completo')).toHaveJSProperty('validity.valueMissing', true)
    await expect(page.getByLabel('Enlace de la invitación')).toHaveCount(0)
  })
})
