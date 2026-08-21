import { expect, test } from '@playwright/test'
import { BRAND } from '../../src/shared/config/brand'

// Built from BRAND so replacing the placeholder number does not turn this suite red.
const WHATSAPP_DIGITS = BRAND.whatsapp.replace(/\D/g, '')

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
  await expect(page.getByText('Bs 1.450')).toBeVisible()
  await expect(page.getByText('Bs 2.900')).toBeVisible()
})

test('el CTA de un plan lleva a WhatsApp con el mensaje correcto', async ({ page }) => {
  await page.goto('/es')
  const cta = page.getByRole('link', { name: 'Firma 3D' }).first()
  await expect(cta).toHaveAttribute('href', new RegExp(`wa\\.me/${WHATSAPP_DIGITS}\\?text=.*Firma%203D`))
})

test('un idioma desconocido en la ruta da 404', async ({ page }) => {
  const response = await page.goto('/fr')
  expect(response?.status()).toBe(404)
})

test('envía una consulta y muestra la confirmación', async ({ page }) => {
  await page.goto('/es#contacto')
  await page.getByLabel('Nombre').fill('María Rojas E2E')
  await page.getByLabel('Email').fill('e2e@example.com')
  await page.getByRole('button', { name: 'Solicitar consulta' }).click()
  await expect(page.getByText('Solicitud recibida')).toBeVisible()
})

test('rechaza una consulta sin ningún contacto', async ({ page }) => {
  await page.goto('/en#contacto')
  await page.getByLabel('Name').fill('No contact E2E')
  await page.getByRole('button', { name: 'Request a consultation' }).click()
  // Scoped to the section: Next renders its own route announcer with role="alert".
  await expect(page.locator('#contacto').getByRole('alert')).toContainText('WhatsApp')
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
