import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN } from './fixtures/atelier'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

const SLUG = 'boda-soporte-e2e'
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/**
 * El admin y los datos de una boda de cliente (decisión del usuario, 15 de septiembre).
 *
 * Sin modo soporte el admin solo ve la ficha —configuración administrativa, plan y vista
 * previa—: invitados, mensajes y el contenido son 404. Entra **como el cliente** con motivo,
 * lo que cambie queda firmado a su nombre, y «Regresar como admin» le devuelve a la cartera.
 *
 * **Sesión propia, no la de `auth.setup.ts`.** El modo soporte vive en la sesión: con la
 * compartida, las suites de después seguirían actuando como el cliente.
 */
test.describe.configure({ mode: 'serial' })

test.describe('soporte como el cliente', () => {
  let contexto: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedCliente(SLUG)
    contexto = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.40' } })
    page = await contexto.newPage()
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    // El admin no cae en ninguna boda: su puerta es la administración.
    await expect(page).toHaveURL(/\/panel\/admin$/)
  })

  test.afterAll(async () => {
    await contexto.close()
    await sql`delete from audit_log where subject = ${SLUG} or detail like ${`como ${CLIENTE.email}%`}`
    await deleteClienteFixture(SLUG)
    await closeClienteDb()
    await sql.end({ timeout: 5 })
  })

  test('sin modo soporte, el admin no abre los datos de la boda', async () => {
    for (const ruta of ['', '/invitados', '/mensajes', '/mesas', '/planner/tareas', '/extras']) {
      expect((await page.goto(`/panel/eventos/${SLUG}${ruta}`))?.status(), `sección ${ruta || 'resumen'}`).toBe(404)
    }
  })

  test('pero sí su ficha: configuración sin el contenido del cliente, plan y vista previa', async () => {
    expect((await page.goto(`/panel/eventos/${SLUG}/configuracion`))?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Detalles del evento' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Contenido de la invitación/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Fotografías y música' })).toHaveCount(0)
    expect((await page.goto(`/panel/eventos/${SLUG}/plan`))?.status()).toBe(200)
    expect((await page.goto(`/panel/eventos/${SLUG}/vista-previa`))?.status()).toBe(200)
  })

  test('entra como el cliente con motivo, cambia algo firmado a su nombre y regresa', async () => {
    await page.goto(`/panel/admin/eventos?q=${SLUG}`)
    const fila = page.getByRole('listitem').filter({ has: page.locator(`a[href="/panel/eventos/${SLUG}/configuracion"]`) }).first()
    await fila.locator('summary').click()
    await fila.getByLabel('Motivo (se le envía al cliente)').fill('La canción no suena en la invitación')
    await fila.getByRole('button', { name: 'Entrar como el cliente' }).click()

    await expect(page).toHaveURL(new RegExp(`/panel/eventos/${SLUG}$`), { timeout: 30_000 })
    await expect(page.getByRole('status').filter({ hasText: CLIENTE.email })).toBeVisible()

    // Ve lo que ve el cliente.
    expect((await page.goto(`/panel/eventos/${SLUG}/invitados`))?.status()).toBe(200)

    // Y lo que cambia queda registrado como el admin.
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    const cancion = page.locator('form', { has: page.getByRole('heading', { name: 'Canción', exact: true }) })
    await cancion.getByLabel('Canción', { exact: true }).fill('Arreglada por soporte')
    await cancion.getByRole('button', { name: 'Guardar' }).click()
    await expect(cancion.getByText('Guardado.')).toBeVisible()
    await expect
      .poll(async () => (await sql<{ n: number }[]>`select count(*)::int as n from audit_log where action = 'soporte.accion' and actor_email = ${ADMIN.email} and detail = ${`como ${CLIENTE.email}`}`)[0]!.n)
      .toBeGreaterThan(0)

    // La cuenta del cliente no se toca en modo soporte.
    expect((await page.goto('/panel/cuenta'))?.status()).toBe(404)

    await page.goto(`/panel/eventos/${SLUG}`)
    // La salida está en dos sitios a la vista: la franja de arriba y lo primero de la barra.
    await expect(page.getByRole('button', { name: 'Regresar al panel de admin' })).toBeVisible()
    await page.getByRole('button', { name: 'Regresar como admin' }).click()
    await expect(page).toHaveURL(/\/panel\/admin\/eventos$/, { timeout: 30_000 })
    expect((await page.goto(`/panel/eventos/${SLUG}/invitados`))?.status()).toBe(404)

    const [entrada] = await sql<{ n: number }[]>`select count(*)::int as n from audit_log where action in ('soporte.entrada', 'soporte.salida') and actor_email = ${ADMIN.email} and (subject = ${SLUG} or detail = ${`como ${CLIENTE.email}`})`
    expect(entrada!.n).toBe(2)
  })

  test('un cliente no llega a nada de admin', async ({ browser }) => {
    const cliente = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.41' } })
    const suya = await cliente.newPage()
    await suya.goto('/panel/entrar')
    await suya.getByLabel('Correo').fill(CLIENTE.email)
    await suya.getByLabel('Contraseña').fill(CLIENTE.password)
    await suya.getByRole('button', { name: 'Entrar' }).click()
    await expect(suya).toHaveURL(new RegExp(`/panel/eventos/${SLUG}$`))
    await expect(suya.getByRole('button', { name: 'Regresar como admin' })).toHaveCount(0)
    // Ni rastro de la administración en su barra.
    for (const enlace of ['Hoy', 'Usuarios', 'Planes', 'Auditoría']) await expect(suya.getByRole('link', { name: enlace, exact: true })).toHaveCount(0)
    await expect(suya.getByText('Cliente', { exact: true })).toBeVisible()
    for (const ruta of ['/panel/admin', '/panel/admin/eventos', '/panel/admin/auditoria']) {
      expect((await suya.goto(ruta))?.status(), ruta).toBe(404)
    }
    await cliente.close()
  })
})
