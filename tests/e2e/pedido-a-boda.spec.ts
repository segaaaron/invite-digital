import { expect, test } from '@playwright/test'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'
import { closeDb, deleteOrdersOf, deleteProvisioned, seedOrder } from './fixtures/pedido-a-boda'

// IP propia para el limitador de inicios de sesión (cinco por IP): en el CI todas las suites salen de 127.0.0.1.
test.use({ extraHTTPHeaders: { 'x-real-ip': '10.99.0.5' } })

const CLIENTE = 'Novios del camino completo e2e'
const CORREO = 'novios-camino-e2e@invitepremium.bo'
const CLAVE = 'contrasena-del-camino-1'
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

    // 1. El **admin** aprueba, dando el correo con el que entrará el cliente. No es el
    // atelier: aprobar crea la cuenta del cliente y un evento cuyo dueño es quien aprueba.
    const atelier = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
    await atelier.goto('/panel/pedidos')
    const tarjeta = atelier.locator('section', { hasText: REFERENCIA }).first()

    await tarjeta.getByLabel(/Correo del cliente/).fill(CORREO)
    await tarjeta.getByLabel(/Contraseña inicial/).fill(CLAVE)
    await tarjeta.getByRole('button', { name: 'Aprobar pago' }).click()

    // 2. La tarjeta dice que la boda existe, y lo dice **leyéndolo de la base**: el
    // formulario de decisión ya no está: se desmontó al dejar el pedido de estar «por
    // revisar». Si esto dependiera de su estado, aquí no habría nada.
    const aprobada = atelier.locator('section', { hasText: REFERENCIA }).first()
    await expect(aprobada).toContainText('Aprobado')
    await expect(aprobada).toContainText('Evento creado')

    // Y sobrevive a recargar, que es lo que de verdad hace el atelier.
    await atelier.reload()
    await expect(atelier.locator('section', { hasText: REFERENCIA }).first()).toContainText('Evento creado')

    // 3. El admin ve la ficha de la boda nueva, no sus datos: esos son del cliente.
    const slug = `evento-${REFERENCIA.toLowerCase()}`
    await atelier.goto(`/panel/eventos/${slug}/configuracion`)
    await expect(atelier.getByRole('heading', { name: 'Detalles del evento' })).toBeVisible()
    expect((await atelier.goto(`/panel/eventos/${slug}/planner/tareas`))?.status()).toBe(404)

    // 4. Los novios entran con lo que les dieron... y lo primero es elegir su contraseña.
    //
    // La que escribió el admin viajó por correo, así que nace **provisional**: el panel no
    // se abre hasta que la cambien. Aterrizar aquí y no en la boda es lo correcto.
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(CORREO)
    await page.getByLabel('Contraseña').fill(CLAVE)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/panel\/cuenta$/)

    const SUYA = 'la-que-eligen-los-novios-1'
    await page.getByLabel('Contraseña actual').fill(CLAVE)
    await page.getByLabel('Contraseña nueva').fill(SUYA)
    await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()

    // Cambiarla cierra todas las sesiones, así que vuelven a entrar — ahora sí, a su boda.
    await expect(page).toHaveURL(/\/panel\/entrar/)
    await page.getByLabel('Correo').fill(CORREO)
    await page.getByLabel('Contraseña').fill(SUYA)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(new RegExp(`/panel/eventos/${slug}$`))

    // Lo suyo sí; lo del atelier, no.
    await page.goto(`/panel/eventos/${slug}/invitados`)
    // Con el nivel: «Invitados» es el `h1` de la cabecera **y** el `h2` de la tarjeta, y
    // sin acotarlo el locator casa con los dos.
    await expect(page.getByRole('heading', { name: 'Invitados', level: 1 })).toBeVisible()
    // Su invitación **sí** se abre: es donde escribe sus textos y elige la canción que
    // sube. Esta línea exigía 404 hasta que el acceso del cliente pasó a incluirla; lo que
    // sigue siendo del atelier son las tarjetas de dentro, no la pantalla.
    expect((await page.goto(`/panel/eventos/${slug}/configuracion`))?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Detalles del evento' })).toHaveCount(0)

    // La boda nació con el diseño que se eligió en el escaparate. Por rol y no por texto
    // suelto: el título de la tarjeta es un `h2` y es único.
    await expect(page.getByRole('heading', { name: 'Contenido de la invitación · Botánica' })).toBeVisible()

    // Y con su plan de tareas ya sembrado: el pedido aprobado no deja un evento sin planner.
    await page.goto(`/panel/eventos/${slug}/planner/tareas`)
    await expect(page.getByRole('button', { name: 'Crear el plan con la plantilla' })).toHaveCount(0)
    await expect(page.locator('summary', { hasText: '12 meses antes' })).toBeVisible()

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
