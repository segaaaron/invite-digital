import { expect, test } from '@playwright/test'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'
import { closeDb, deleteOrdersOf, deleteProvisioned, seedOrder } from './fixtures/pedido-a-boda'

// IP propia para el limitador de inicios de sesión (cinco por IP): en el CI todas las suites salen de 127.0.0.1.
test.use({ extraHTTPHeaders: { 'x-real-ip': '10.99.0.5' } })

const CLIENTE = 'Novios del camino completo e2e'
const CORREO = 'novios-camino-e2e@invitepremium.bo'
const DISENO = 'boda-bot'
const REFERENCIA = 'E2ECAMIN'

/**
 * Aprobar un pedido crea la boda: con su diseño, su plan y el acceso del cliente.
 *
 * Es lo que unía el escaparate con el panel y faltaba. La otra suite de pedidos aprueba
 * **sin** correo ni fecha —el camino en el que la boda no se crea—; esta cubre el que sí.
 *
 * El pedido se **siembra**, no se crea por el formulario público: ese extremo tiene un
 * tope de tres por minuto y por IP, y con dos suites pidiendo se agotaba y tumbaba a la
 * vecina. Esa protección no se toca para acomodar una prueba.
 */
test.describe.configure({ mode: 'serial' })

test('aprobar el pedido crea la boda con su diseño, y el cliente entra a ella', async ({ page, browser }) => {
  try {
    await deleteProvisioned(REFERENCIA, CORREO)
    await deleteOrdersOf(CLIENTE)
    await seedOrder({
      publicRef: REFERENCIA,
      customerName: CLIENTE,
      contact: CORREO,
      eventDate: '2027-09-18',
      templateSlug: DISENO,
      planSlug: 'firma-3d',
    })

    // 1. El **admin** aprueba desde la ficha de la venta. El contacto del pedido es un correo:
    // no pide nada más —la contraseña provisional se genera sola y le llega por correo—.
    const atelier = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
    await atelier.goto(`/panel/admin/ventas?venta=p-${REFERENCIA}`)
    const ficha = atelier.locator('dialog[open]')
    await ficha.getByRole('button', { name: 'Aprobar pago' }).click()

    // 2. La venta queda cerrada con su evento, **leído de la base**: sobrevive a recargar.
    await expect(ficha.getByText('Evento creado')).toBeVisible()
    await atelier.reload()
    await expect(atelier.locator('dialog[open]').getByText('Evento creado')).toBeVisible()

    // 3. El admin ve la ficha de la boda nueva, no sus datos: esos son del cliente.
    const slug = `evento-${REFERENCIA.toLowerCase()}`
    await atelier.goto(`/panel/eventos/${slug}/configuracion`)
    await expect(atelier.getByRole('heading', { name: 'Datos y diseño' })).toBeVisible()
    expect((await atelier.goto(`/panel/eventos/${slug}/planner/tareas`))?.status()).toBe(404)

    // Sin proveedor de correo (como aquí), la contraseña provisional no le llegó: el admin la
    // restablece en la ficha y la ve **una vez**, para pasársela por WhatsApp.
    await atelier.goto(`/panel/eventos/${slug}/configuracion#acceso`)
    await atelier.getByRole('button', { name: 'Restablecer acceso' }).click()
    const CLAVE = (await atelier.locator('code').filter({ hasText: /^[A-Za-z0-9_-]{12,}$/ }).first().innerText()).trim()
    expect(CLAVE.length).toBeGreaterThanOrEqual(12)

    // 4. Los novios entran con lo que les dieron... y lo primero es elegir su contraseña.
    //
    // La que escribió el admin viajó por correo, así que nace **provisional**: el panel no
    // se abre hasta que la cambien. Aterrizar aquí y no en la boda es lo correcto.
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(CORREO)
    await page.getByLabel('Contraseña').fill(CLAVE)
    await page.getByRole('button', { name: 'Entrar' }).click()
    // Su pantalla propia, fuera del panel: con la provisional no se entra a ninguna otra.
    await expect(page).toHaveURL(/\/panel\/nueva-contrasena$/)

    const SUYA = 'la-que-eligen-los-novios-1'
    await page.getByLabel('Tu contraseña nueva').fill(SUYA)
    await page.getByRole('button', { name: 'Guardar y entrar' }).click()

    // Entran directo a su boda, sin volver a escribirla.
    await expect(page).toHaveURL(new RegExp(`/panel/eventos/${slug}(/configuracion)?$`), { timeout: 20_000 })

    // Lo suyo sí; lo del atelier, no.
    await page.goto(`/panel/eventos/${slug}/invitados`)
    // Con el nivel: «Invitados» es el `h1` de la cabecera **y** el `h2` de la tarjeta, y
    // sin acotarlo el locator casa con los dos.
    await expect(page.getByRole('heading', { name: 'Invitados', level: 1 })).toBeVisible()
    // Su invitación **sí** se abre: es donde escribe sus textos y elige la canción que
    // sube. Esta línea exigía 404 hasta que el acceso del cliente pasó a incluirla; lo que
    // sigue siendo del atelier son las tarjetas de dentro, no la pantalla.
    expect((await page.goto(`/panel/eventos/${slug}/configuracion`))?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Datos y diseño' })).toHaveCount(0)

    // La boda nació con el diseño que se eligió en el escaparate. Por rol y no por texto
    // suelto: el título de la tarjeta es un `h2` y es único.
    await expect(page.getByRole('heading', { name: 'Tu invitación · Botánica' })).toBeVisible()

    // Sin tareas de ejemplo: el plan se crea cuando el anfitrión lo pide.
    await page.goto(`/panel/eventos/${slug}/planner/tareas`)
    await expect(page.getByRole('button', { name: 'Crear el plan con la plantilla' })).toBeVisible()

    // Y el plan sigue fuera, que es lo que de verdad es del atelier.
    expect((await page.goto(`/panel/eventos/${slug}/plan`))?.status()).toBe(404)
  } finally {
    // Se limpia aunque falle: si no, la siguiente ejecución encuentra la boda ya creada y
    // la aprobación respondería «ya estaba creada» — verde por el motivo equivocado.
    await deleteProvisioned(REFERENCIA, CORREO)
    await deleteOrdersOf(CLIENTE)
    await closeDb()
  }
})
