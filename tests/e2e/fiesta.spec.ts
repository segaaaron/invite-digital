import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'

/**
 * Bodas y XV son dos fiestas: el panel de unos XV no puede hablar de novios ni de bodas en
 * ninguna sección. Lo vigila esta prueba recorriéndolas todas.
 */
const SLUG = 'xv-fiesta-e2e'
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

// El atelier dueño: el admin ya no abre los datos de un evento (solo su ficha).
test.use({ storageState: AUTH_STATE })

test.beforeAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = ${ATELIER.email}), ${SLUG}, 'XV de Valeria', '2027-08-14', '2027-08-01', 'es', 'xv-valeria', 'live',
            (select id from plans where slug = 'alta-costura'))`
})

test.afterAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql.end({ timeout: 5 })
})

for (const seccion of ['', '/invitados', '/mesas', '/mesas?panel=mesa', '/regalos', '/mensajes', '/checkin', '/porteros', '/estadisticas', '/configuracion']) {
  test(`el panel de unos XV no habla de bodas · ${seccion || 'resumen'}`, async ({ page }) => {
    await page.goto(`/panel/eventos/${SLUG}${seccion}`)
    const principal = page.locator('main')
    await expect(principal).toBeVisible()
    // Solo el contenido de la sección: la barra lateral lista la administración entera.
    const texto = await principal.innerText()
    expect(texto).not.toMatch(/\bnovi[oa]s?\b|\bboda\b|\bbodas\b|primer baile/i)
  })
}
