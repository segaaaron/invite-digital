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
    const fila = page.locator('details').filter({ hasText: MENSAJE })
    await expect(fila).toBeVisible()
    await fila.locator('summary').click()
    await expect(fila).toContainText('bloque.tsx:12:3')
    await expect(fila).toContainText('/panel/eventos/x/configuracion')
    await fila.getByRole('button', { name: 'Ya está arreglado: borrar' }).click()
    await expect(page.locator('details').filter({ hasText: MENSAJE })).toHaveCount(0)
  })
})

test.describe('guardar la invitación no pierde nada', () => {
  test.use({ storageState: AUTH_STATE })

  test('el enlace largo de Google Maps se guarda entero; un texto que no cabe se avisa y no se guarda', async ({ page }) => {
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

    await recepcion.getByLabel('Lugar', { exact: true }).fill('x'.repeat(260))
    await recepcion.getByRole('button', { name: 'Guardar' }).click()
    await expect(recepcion.getByRole('alert')).toContainText('«Lugar» es demasiado largo: acórtalo a 240 caracteres. No se guardó nada.')
    const [lugar] = await sql<{ place: string }[]>`select blocks->'reception'->>'place' as place from event_content c join events e on e.id = c.event_id where e.slug = ${SLUG}`
    expect(lugar!.place).toBe('Salón Los Ceibos')
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
})

