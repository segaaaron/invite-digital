import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const PREFIJO = 'paginacion-e2e'

/**
 * Las bandejas del admin se pintan por tandas de 20 (15 de septiembre de 2026): con toda la
 * historia pesaban 16 MB (pedidos) y 4,9 MB (cartera). Se siembran 25 de cada una y se comprueba
 * que salen 20, que «Ver más» trae el resto y que los recuentos siguen siendo de todas.
 */
test.use({ storageState: ADMIN_AUTH_STATE })

test.beforeAll(async () => {
  await sql`delete from orders where customer_name like ${`${PREFIJO}%`}`
  await sql`delete from events where slug like ${`${PREFIJO}%`}`
  await sql`
    insert into orders (public_ref, customer_name, contact, status, created_at)
    select 'PG' || upper(translate(substr(md5(${PREFIJO} || g::text), 1, 6), '01', 'ab')), ${PREFIJO} || ' ' || g, '+5917000' || lpad(g::text, 4, '0'), 'pending_payment', now() - (g || ' minutes')::interval
    from generate_series(1, 35) g`
  await sql`
    insert into events (slug, title, event_date, rsvp_deadline, locale, theme_key, status, user_id)
    select ${PREFIJO} || '-' || g, 'Boda paginada ' || g, current_date + g, current_date + g, 'es', 'boda-bot', 'draft',
           (select id from users where email = 'admin-e2e@invitepremium.bo')
    from generate_series(1, 25) g`
})

test.afterAll(async () => {
  await sql`delete from orders where customer_name like ${`${PREFIJO}%`}`
  await sql`delete from events where slug like ${`${PREFIJO}%`}`
  await sql.end({ timeout: 5 })
})

test('la lista de ventas pinta 30 y «Ver más» trae el resto', async ({ page }) => {
  await page.goto(`/panel/admin/ventas?vista=lista&etapa=esperando_pago&q=${PREFIJO}`)
  const filas = page.getByRole('listitem').filter({ hasText: PREFIJO })
  await expect(filas).toHaveCount(30)

  await page.getByRole('link', { name: 'Ver 5 ventas más' }).click()
  await expect(page).toHaveURL(/n=60/)
  await expect(filas).toHaveCount(35)
  await expect(page.getByRole('link', { name: /ventas más/ })).toHaveCount(0)
})

test('la cartera pinta 20 bodas, dice cuántas quedan y «Ver más» trae el resto', async ({ page }) => {
  await page.goto(`/panel/admin/eventos?q=${PREFIJO}`)
  const filas = page.getByRole('listitem').filter({ hasText: 'Boda paginada' })
  await expect(filas).toHaveCount(20)

  await page.getByRole('link', { name: 'Ver 5 eventos más' }).click()
  await expect(page).toHaveURL(new RegExp(`q=${PREFIJO}&n=40`))
  await expect(filas).toHaveCount(25)
})
