import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

// El WhatsApp vive en «La web» (app_settings). La prueba de precios siembra uno propio y
// deja la fila como estaba: no depende de lo que el admin tenga configurado en la base.
const WHATSAPP_DIGITS = '59170000001'

test('redirige a español según la cabecera del navegador', async ({ browser }) => {
  const context = await browser.newContext({
    locale: 'es-BO',
    extraHTTPHeaders: { 'Accept-Language': 'es-BO,es;q=0.9' },
  })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/es$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await context.close()
})

test('cae a inglés con un idioma no soportado', async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9' } })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/en$/)
  await context.close()
})

test('muestra los tres planes con precios en bolivianos', async ({ page }) => {
  await page.goto('/es')
  await expect(page.getByText('Bs 690')).toBeVisible()
  await expect(page.getByText('Bs 1.190')).toBeVisible()
  await expect(page.getByText('Bs 1.990')).toBeVisible()
})

test('el CTA de un plan que se compra abre el pedido; el más caro, una llamada', async ({ browser, page }) => {
  // El WhatsApp se cambia **desde «La web» del admin**, no con SQL: la web pública cachea sus
  // datos y es guardar en el admin lo que la invalida. Con SQL la portada seguiría enseñando
  // el número de antes, que es justo el comportamiento correcto.
  const admin = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
  const guardarWhatsapp = async (numero: string) => {
    await admin.goto('/panel/admin/web')
    const campo = admin.getByLabel('WhatsApp del negocio')
    if ((await campo.inputValue()) === numero) return
    await campo.fill(numero)
    await admin.getByRole('button', { name: 'Guardar cambios' }).click()
    // Se comprueba lo guardado recargando, no el aviso: la acción revalida el árbol y remonta
    // el formulario, y «Guardado.» puede desaparecer antes de que la prueba lo mire.
    await expect(async () => {
      await admin.goto('/panel/admin/web')
      await expect(admin.getByLabel('WhatsApp del negocio')).toHaveValue(numero, { timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
  }
  await admin.goto('/panel/admin/web')
  const previo = await admin.getByLabel('WhatsApp del negocio').inputValue()
  await guardarWhatsapp(`+${WHATSAPP_DIGITS}`)
  try {
    await page.goto('/es')

    // Desde el Plan B, «Firma 3D» se compra: su botón abre el pedido. Dejarlo en WhatsApp
    // sería tener el flujo construido y sin ninguna puerta que lo alcance.
    await expect(page.getByRole('link', { name: 'Firma 3D' }).first()).toHaveAttribute('href', '/es/pedido/firma-3d')

    // El más caro se cotiza, no se compra de un clic: sigue agendando la llamada, como en
    // la maqueta.
    await expect(page.getByRole('link', { name: 'Agendar llamada' }).first()).toHaveAttribute(
      'href',
      new RegExp(`wa\\.me/${WHATSAPP_DIGITS}\\?text=`),
    )
  } finally {
    await guardarWhatsapp(previo)
    await admin.context().close()
  }
})

test('el hero se ve aunque se llegue por un ancla y se suba después', async ({ page }) => {
  // El caso real: se entra por «#precios», se sube al principio, y la portada aparecía
  // con el sobre y sin una sola palabra, porque el texto esperaba a cruzar el viewport.
  await page.goto('/es#precios')
  await page.waitForTimeout(500)
  await page.evaluate(() => window.scrollTo(0, 0))

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /crear invitación/i }).first()).toBeVisible()

  const opacidad = await page
    .locator('#hero [data-reveal="mount"]')
    .first()
    .evaluate((el) => Number(getComputedStyle(el).opacity))
  expect(opacidad).toBeGreaterThan(0.9)
})

test('un idioma desconocido en la ruta da 404', async ({ page }) => {
  const response = await page.goto('/fr')
  expect(response?.status()).toBe(404)
})

// Su propia conexión, como el resto de suites que escriben: compartir el pool deja a la
// otra escribiendo contra una conexión cerrada.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

// La consulta que envía esta prueba **se queda en la base**, y desde que el admin tiene
// bandeja de consultas cada pasada le dejaba una «María Rojas E2E» más: 174 en la de
// desarrollo antes de que alguien las viera.
test.afterAll(async () => {
  await sql`delete from consultation_requests where email = 'e2e@example.com' and name = 'María Rojas E2E'`
  await sql.end({ timeout: 5 })
})

test('envía una consulta y muestra la confirmación', async ({ page }) => {
  await page.goto('/es#contacto')
  // Nombre y apellido van separados, como en la maqueta, y se guardan como un nombre.
  await page.getByLabel('Nombre', { exact: true }).fill('María')
  await page.getByLabel('Apellido').fill('Rojas E2E')
  await page.getByLabel('Correo electrónico').fill('e2e@example.com')
  await page.getByRole('button', { name: 'Solicitar consulta' }).click()
  await expect(page.getByText('Solicitud recibida')).toBeVisible()
})

test('el navegador no deja enviar una consulta sin correo', async ({ page }) => {
  // El correo es el único camino de vuelta desde que el formulario dejó de pedir
  // teléfono: es obligatorio, y el navegador corta antes de gastar una petición.
  await page.goto('/en#contacto')
  await page.getByLabel('Name', { exact: true }).fill('No contact')
  await page.getByLabel('Last name').fill('E2E')
  await page.getByRole('button', { name: 'Request a consultation' }).click()

  await expect(page.getByText('Request received')).toHaveCount(0)
  await expect(page.getByLabel('Email address')).toHaveJSProperty('validity.valueMissing', true)
})

test('publica hreflang para ambos idiomas y x-default', async ({ page }) => {
  await page.goto('/es')
  const hreflangs = await page.locator('link[rel="alternate"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute('hreflang')),
  )
  expect(hreflangs).toEqual(expect.arrayContaining(['es', 'en', 'x-default']))
})

test('el sitemap incluye ambas ramas de idioma', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('/es')
  expect(body).toContain('/en')
})

test('robots.txt anuncia el sitemap del dominio en ejecución, no el del build', async ({ request, baseURL }) => {
  // `robots.txt` se prerrenderizaba en tiempo de compilación, así que se quedaba con el
  // SITE_URL falso del Dockerfile y en producción anunciaba un sitemap en localhost.
  // Un fallo silencioso: el sitio sirve, pero Google nunca encuentra el sitemap.
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`)
})

test('la imagen Open Graph solo existe para idiomas reales', async ({ page, request }) => {
  // La URL la elige Next (le añade un hash propio), así que se lee de la propia
  // metadata en vez de fijarla aquí: si se fijara, un cambio de ruta interno
  // rompería la prueba sin que nada del contrato se hubiera roto.
  await page.goto('/es')
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(ogImage).not.toBeNull()
  expect((await request.get(ogImage!)).status()).toBe(200)

  expect((await request.get('/fr')).status()).toBe(404)
  expect((await request.get('/fr/opengraph-image')).status()).toBe(404)
})

test('las cabeceras de seguridad llegan al cliente', async ({ request }) => {
  const response = await request.get('/es')
  const headers = response.headers()
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['x-powered-by']).toBeUndefined()
})

test('cada fiesta tiene su página con solo sus modelos, y la portada lleva a las dos', async ({ page, request }) => {
  await page.goto('/es')
  await expect(page.getByRole('link', { name: /Bodas/ }).filter({ hasText: 'Wedding Planner' })).toHaveAttribute('href', '/es/bodas')
  await expect(page.getByRole('link', { name: /XV años/ }).filter({ hasText: 'XV Planner' })).toHaveAttribute('href', '/es/xv-anos')

  await page.goto('/es/xv-anos')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('XV')
  // La página de cada fiesta enseña todos sus modelos: nueve XV y once bodas (los demás, retirados).
  const modelos = page.locator('#modelos').getByRole('link', { name: /abrir/i })
  await expect(modelos).toHaveCount(9)
  for (const href of await modelos.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) expect(href).toMatch(/\/modelos\/es\/xv/)

  await page.goto('/es/bodas')
  await expect(page.locator('#modelos').getByRole('link', { name: /abrir/i })).toHaveCount(11)
  await expect(page.locator('#precios')).toBeVisible()

  const mapa = await (await request.get('/sitemap.xml')).text()
  expect(mapa).toContain('/es/bodas')
  expect(mapa).toContain('/es/xv-anos')
})
