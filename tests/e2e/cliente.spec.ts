import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { CLIENTE, closeClienteDb, deleteClienteFixture, EQUIPO, fijarClave, membresiaDe, seedCliente } from './fixtures/cliente'

const SLUG = 'boda-acceso-cliente-e2e'

/**
 * El panel del cliente: los novios entran, ven **su** boda y reparten sus enlaces.
 *
 * Lo que esta suite vigila es el corte **en el servidor**, por los dos lados: que lo suyo
 * se abra y que lo del atelier devuelva 404 aunque se escriba la dirección a mano, porque
 * una página del panel es un extremo HTTP y el enlace no es la puerta.
 *
 * **Dónde cae la raya**: su invitación —textos, canción, fotografías— es suya; el evento
 * —diseño, `slug`, contraseña, borrado, plan, QR, check-in y los accesos— es del atelier
 * que se la vendió.
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

  test('abre su planner y suma una tarea propia', async () => {
    expect((await page.goto(`/panel/eventos/${SLUG}/planner/presupuesto`))?.status()).toBe(200)
    await page.goto(`/panel/eventos/${SLUG}/planner/tareas?panel=tarea`)
    await page.getByLabel('Tarea').fill('Probar el peinado')
    await page.getByLabel('Etapa').selectOption('propias')
    await page.getByRole('button', { name: 'Sumar tarea' }).last().click()
    await expect(page.getByRole('listitem', { name: 'Probar el peinado' })).toBeVisible({ timeout: 15_000 })
  })

  test('suma a su planner y a una co-anfitriona desde Equipo', async () => {
    await page.goto(`/panel/eventos/${SLUG}/equipo`)
    for (const [email, kind] of [
      [EQUIPO.planner, 'planner'],
      [EQUIPO.coanfitriona, 'coanfitrion'],
    ] as const) {
      await page.getByLabel('Correo').fill(email)
      await page.getByLabel('Entra como').selectOption(kind)
      await page.getByRole('button', { name: 'Sumar al equipo' }).click()
      await expect(page.getByRole('status').filter({ hasText: email })).toBeVisible({ timeout: 15_000 })
      // Sin proveedor de correo, la contraseña provisional se enseña una vez.
      await expect(page.getByLabel('Contraseña provisional')).toBeVisible()
    }
    expect(await membresiaDe(SLUG, EQUIPO.planner)).toBe('planner')
    expect(await membresiaDe(SLUG, EQUIPO.coanfitriona)).toBe('coanfitrion')
    await expect(page.getByRole('listitem').filter({ hasText: EQUIPO.coanfitriona })).toContainText('Co-anfitrión')
  })

  test('la co-anfitriona organiza, pero no suma gente ni porteros', async ({ browser }) => {
    await fijarClave(EQUIPO.coanfitriona, 'clave-de-la-mama-1')
    const suyo = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const mama = await suyo.newPage()
    await mama.goto('/panel/entrar')
    await mama.getByLabel('Correo').fill(EQUIPO.coanfitriona)
    await mama.getByLabel('Contraseña').fill('clave-de-la-mama-1')
    await mama.getByRole('button', { name: 'Entrar' }).click()
    await expect(mama).toHaveURL(new RegExp(`/panel/eventos/${SLUG}$`), { timeout: 20_000 })

    expect((await mama.goto(`/panel/eventos/${SLUG}/planner/tareas`))?.status()).toBe(200)
    for (const ruta of ['/equipo', '/porteros', '/plan', '/checkin']) {
      expect((await mama.goto(`/panel/eventos/${SLUG}${ruta}`))?.status(), ruta).toBe(404)
    }
    await suyo.close()
  })

  test('entra a su invitación y puede escribirla', async () => {
    // **Esta regla cambió a propósito.** Antes esta prueba exigía un 404: el cliente no
    // tocaba nada. Ahora el admin le da acceso justo para que ajuste su invitación —los
    // textos y su canción—, así que la pantalla se abre. Lo que sigue cerrado es el evento,
    // y eso lo vigilan las dos pruebas de abajo.
    const respuesta = await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    expect(respuesta?.status()).toBe(200)

    await expect(page.getByRole('heading', { name: 'Configuración del evento' })).toBeVisible()

    // Y escribe de verdad: no basta con que la página pinte. Si la guarda de
    // `saveContentBlockAction` siguiera pidiendo `full`, esto reventaría al guardar.
    //
    // El bloque se titula **«Canción»**, no «Música»: el rótulo de la pantalla lo reparte
    // `TITULOS` y no tiene por qué coincidir con la clave del dominio. Y es un `h3` suelto
    // dentro del formulario, así que se acota por el formulario que lo contiene.
    const cancion = page.locator('form', { has: page.getByRole('heading', { name: 'Canción', exact: true }) })
    await cancion.getByLabel('Canción', { exact: true }).fill('Nuestra canción')
    await cancion.getByRole('button', { name: 'Guardar' }).click()

    // **Se espera el «Guardado.» antes de recargar, y no es adorno.** Recargar en el mismo
    // aliento que el clic aborta la Server Action en vuelo: la página vuelve a pintar el
    // contenido de muestra del diseño —«At Last»— y la prueba parece decir que el cliente
    // no puede escribir, cuando lo que pasó es que nunca llegó a guardarse. Pasó.
    await expect(cancion.getByText('Guardado.')).toBeVisible()

    await page.reload()
    await expect(cancion.getByLabel('Canción', { exact: true })).toHaveValue('Nuestra canción')
  })

  test('y el selector de su música está ahí, que es para lo que sube el MP3', async () => {
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)

    const cancion = page.locator('form', { has: page.getByRole('heading', { name: 'Canción', exact: true }) })
    await expect(cancion.getByLabel('Archivo que suena')).toBeVisible()
  })

  test('pero los detalles del evento no son suyos: ni el diseño, ni la contraseña, ni el borrado', async () => {
    // El corte que queda. `EventForm` lleva dentro el selector de **diseño**, el `slug` y
    // el estado: cambiarlos sería cambiarse el modelo que le vendieron, romper los enlaces
    // ya repartidos o devolver la boda a borrador.
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)

    await expect(page.getByRole('heading', { name: 'Detalles del evento' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Acceso del cliente' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Personal de puerta' })).toHaveCount(0)
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
    // Su invitación sí: es la pantalla donde escribe sus textos y elige su canción.
    await expect(barra.getByRole('link', { name: 'Mi invitación' })).toBeVisible()
    // Lo del atelier, no.
    await expect(barra.getByRole('link', { name: 'Plan', exact: true })).toHaveCount(0)
    await expect(barra.getByRole('link', { name: 'Códigos QR' })).toHaveCount(0)
  })

  test('puede cambiar su propia contraseña', async () => {
    // La clave inicial la escribió el atelier y viajó por WhatsApp: sin esta pantalla
    // valdría para siempre.
    await page.goto('/panel/cuenta')

    await expect(page.getByRole('heading', { name: 'Mi cuenta' })).toBeVisible()
    await expect(page.getByLabel('Contraseña actual')).toBeVisible()
  })
})
