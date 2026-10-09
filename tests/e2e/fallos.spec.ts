import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE, AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'
import { abrirSeccion } from './helpers/panel'

/**
 * **El registro de fallos y el guardado sin pérdidas** (28 de septiembre). Un fallo del navegador llega al
 * registro y el admin lo lee con su causa; y «Personalizar invitación» ya no recorta ni descarta en
 * silencio: un enlace largo de Google Maps se guarda entero y un texto que no cabe se avisa sin guardar.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const MENSAJE = `Fallo de prueba e2e ${Date.now()}`
const SLUG = 'guardado-sin-perdidas-e2e'

test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await sql`delete from service_failures where message like 'Fallo de prueba e2e%'`
  await deleteEvent(SLUG)
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test.describe('registro de fallos', () => {
  test.use({ storageState: ADMIN_AUTH_STATE })

  test('un fallo del navegador llega al registro con su causa, y «ya está arreglado» lo borra', async ({ page }) => {
    const r = await page.request.post('/api/fallos', { data: { mensaje: MENSAJE, pila: `Error: ${MENSAJE}\n    at guardar (bloque.tsx:12:3)`, ruta: '/panel/eventos/x/configuracion' } })
    expect(r.status()).toBe(204)
    expect((await page.request.post('/api/fallos', { data: { nada: 1 } })).status()).toBe(400)

    await page.goto('/panel/admin/fallos?dias=1&origen=navegador')
    const fila = page.locator('li > details').filter({ hasText: MENSAJE })
    await expect(fila).toBeVisible()
    // Dicho para personas: dónde pasó, sin la pila a la vista.
    await expect(fila.locator('> summary')).toContainText('En el navegador')
    await expect(fila.locator('> summary')).not.toContainText('bloque.tsx')
    await fila.locator('> summary').click()
    await expect(fila).toContainText('Qué significa')
    await expect(fila).toContainText('/panel/eventos/x/configuracion')
    await fila.getByText('Ver detalle técnico').click()
    await expect(fila).toContainText('bloque.tsx:12:3')
    await fila.getByRole('button', { name: 'Ya está arreglado: borrar' }).click()
    await expect(page.locator('li > details').filter({ hasText: MENSAJE })).toHaveCount(0)
  })
})

test.describe('guardar la invitación no pierde nada', () => {
  test.use({ storageState: AUTH_STATE })

  test('el enlace largo de Google Maps se guarda entero; un texto no pasa de lo que se guarda', async ({ page }) => {
    await seedInvitation({ slug: SLUG })
    await sql`update events set theme_key = 'boda' where slug = ${SLUG}`
    await escribirInvitacion(SLUG)
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)

    const recepcion = await abrirSeccion(page, 'Recepción')
    const largo = `https://www.google.com/maps/place/Sal%C3%B3n+Los+Ceibos/@-17.7833,-63.1821,17z/data=${'!3m1!4b1!4m6!3m5'.repeat(20)}`
    await recepcion.getByLabel('Ubicación en Google Maps').fill(largo)
    await recepcion.getByRole('button', { name: 'Guardar' }).click()
    await expect(recepcion.getByText('Guardado.')).toBeVisible()
    const [guardado] = await sql<{ href: string }[]>`select blocks->'map'->>'href' as href from event_content c join events e on e.id = c.event_id where e.slug = ${SLUG}`
    expect(guardado!.href.length).toBeGreaterThan(300)

    // El campo no deja pasar de lo que se guarda: 240 para «Lugar». (Si algo llegara más largo por otra vía, la
    // acción lo rechaza diciendo el campo: lo cubren las unitarias de `loQueSePerderia`.)
    const lugar = recepcion.getByLabel('Lugar', { exact: true })
    await expect(lugar).toHaveAttribute('maxlength', '240')
    await lugar.fill('')
    await lugar.pressSequentially('x'.repeat(250), { delay: 0 })
    expect((await lugar.inputValue()).length).toBe(240)
  })

  test('cada sección del editor se guarda y responde: «Guardado» o el motivo, nunca silencio', async ({ page }) => {
    await sql`update events set theme_key = 'boda-ed' where slug = ${SLUG}`
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    const tarjetas = page.locator('form[id^="bloque-"]')
    const n = await tarjetas.count()
    expect(n).toBeGreaterThan(8)
    for (let i = 0; i < n; i++) {
      const boton = tarjetas.nth(i).locator('h3 button')
      const titulo = (await boton.innerText()).split('\n')[0]!.trim()
      if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click()
      const seccion = tarjetas.nth(i)
      const guardar = seccion.getByRole('button', { name: 'Guardar' })
      if (!(await guardar.isVisible())) continue
      await guardar.click()
      await expect(seccion.getByText('Guardado.').or(seccion.getByRole('alert')), titulo).toBeVisible()
      await expect(seccion.getByRole('alert'), `${titulo}: no debería fallar con su propio contenido`).toHaveCount(0)
    }
    expect((await sql<{ n: number }[]>`select count(*)::int as n from service_failures where created_at > now() - interval '2 minutes' and service like 'events/%'`)[0]!.n).toBe(0)
  })

  test('código de vestimenta: un detalle de un párrafo se guarda entero y el campo no deja pasar del tope', async ({ page }) => {
    // Editorial pide el detalle (no todos los diseños lo pintan).
    await sql`update events set theme_key = 'boda-ed' where slug = ${SLUG}`
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    const vestimenta = await abrirSeccion(page, 'Código de vestimenta')
    const detalle = vestimenta.getByLabel('Detalle', { exact: true })
    await detalle.fill('Traje oscuro y vestido largo. '.repeat(17))
    await expect(detalle).toHaveAttribute('maxlength', '600')
    await vestimenta.getByRole('button', { name: 'Guardar' }).click()
    await expect(vestimenta.getByText('Guardado.')).toBeVisible()
    await expect(vestimenta.getByRole('alert')).toHaveCount(0)
    const [fila] = await sql<{ d: string }[]>`select blocks->'dressCode'->>'detail' as d from event_content c join events e on e.id = c.event_id where e.slug = ${SLUG}`
    expect(fila!.d.length).toBeGreaterThan(400)

    await detalle.fill('')
    await detalle.pressSequentially('x'.repeat(610), { delay: 0 })
    expect((await detalle.inputValue()).length).toBe(600)
    await expect(vestimenta.getByText('600 / 600')).toBeVisible()
  })
})

