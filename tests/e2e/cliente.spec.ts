import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

const SLUG = 'boda-acceso-cliente-e2e'

/**
 * El panel del cliente: los novios entran, ven **su** boda y reparten sus enlaces.
 *
 * Lo que esta suite vigila es el corte **en el servidor**. Que la barra no enseñe
 * Configuración es cortesía; lo que importa es que escribir la dirección a mano devuelva
 * 404, porque una página del panel es un extremo HTTP y el enlace no es la puerta.
 *
 * **Inicia sesión una sola vez, en `beforeAll`, y comparte contexto.** Con el login en un
 * `beforeEach` eran siete intentos de la misma cuenta en un minuto, y el limitador
 * —tres por cuenta, cinco por IP— los rechazaba: pasaban los tres primeros y los demás
 * se quedaban en `/panel/entrar`. Además consumía el cupo de la IP y tumbaba a las suites
 * vecinas que también inician sesión. Es la misma razón por la que `auth.setup.ts` guarda
 * la cookie una vez para todo el resto de la suite.
 */
test.describe.configure({ mode: 'serial' })

test.describe('el panel del cliente', () => {
  let contexto: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedCliente(SLUG)

    // Contexto propio y vacío: esta suite no usa la cookie del atelier que guarda
    // `auth.setup.ts`, y un solo inicio de sesión sirve para todas sus pruebas.
    contexto = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    page = await contexto.newPage()

    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(CLIENTE.email)
    await page.getByLabel('Contraseña').fill(CLIENTE.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    // Entrar le deja en su boda, no en la bandeja: es el único evento que ve.
    await expect(page).toHaveURL(new RegExp(`/panel/eventos/${SLUG}$`))
  })

  test.afterAll(async () => {
    await contexto.close()
    await deleteClienteFixture(SLUG)
    await closeClienteDb()
  })

  test('ve sus invitados', async () => {
    // Con el parámetro, no pulsando la pestaña: la vista por defecto es la de personas y
    // la etiqueta del grupo solo se pinta en la de grupos. Es la regla de la casa — las
    // e2e navegan al estado que quieren mirar en vez de depender de un clic previo.
    await page.goto(`/panel/eventos/${SLUG}/invitados?vista=grupos`)

    await expect(page.getByText('Familia Vargas')).toBeVisible()
  })

  test('y el recuento de su lista', async () => {
    await page.goto(`/panel/eventos/${SLUG}/invitados`)

    await expect(page.getByText('1 grupos · 3 cupos')).toBeVisible()
  })

  test('Configuración le responde 404: el diseño y el plan son del atelier', async () => {
    // El corte de verdad. Si esto se pintara, el cliente podría cambiar el diseño de la
    // invitación que le vendieron —o borrar el evento entero.
    const respuesta = await page.goto(`/panel/eventos/${SLUG}/configuracion`)

    expect(respuesta?.status()).toBe(404)
  })

  test('y el plan y los códigos QR, también', async () => {
    expect((await page.goto(`/panel/eventos/${SLUG}/plan`))?.status()).toBe(404)
    expect((await page.goto(`/panel/eventos/${SLUG}/qr`))?.status()).toBe(404)
  })

  test('el check-in es de la puerta, no suyo', async () => {
    expect((await page.goto(`/panel/eventos/${SLUG}/checkin`))?.status()).toBe(404)
  })

  test('la barra no le ofrece lo que no puede abrir', async () => {
    await page.goto(`/panel/eventos/${SLUG}`)

    const barra = page.getByRole('navigation')
    await expect(barra.getByRole('link', { name: 'Invitados' })).toBeVisible()
    await expect(barra.getByRole('link', { name: 'Configuración' })).toHaveCount(0)
    await expect(barra.getByRole('link', { name: 'Plan', exact: true })).toHaveCount(0)
  })

  test('puede cambiar su propia contraseña', async () => {
    // La clave inicial la escribió el atelier y viajó por WhatsApp: sin esta pantalla
    // valdría para siempre.
    await page.goto('/panel/cuenta')

    await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible()
    await expect(page.getByLabel('Contraseña actual')).toBeVisible()
  })
})
