import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'

const SLUG = 'boda-qr-e2e'
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: AUTH_STATE })

test.afterAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql.end({ timeout: 5 })
})

test('un código apunta a nosotros, redirige, cuenta y se le cambia el destino sin reimprimir', async ({
  page,
  browser,
}) => {
  await sql`delete from events where slug = ${SLUG}`
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = ${ATELIER.email}),
            ${SLUG}, 'Boda de los códigos', '2027-08-14', '2027-07-30', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
  `

  await page.goto(`/panel/eventos/${SLUG}/qr`)
  await page.getByLabel('Para qué es').fill('Mesa de regalos')
  await page.getByLabel('A dónde lleva').fill('/es/colecciones')
  await page.getByRole('button', { name: '+ Crear código' }).click()

  const fila = page.getByRole('listitem').filter({ hasText: 'Mesa de regalos' })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText('0 escaneos')

  // El identificador sale de la base: lo que se imprime es `/r/<id>`, no el destino.
  const [creado] = await sql<{ id: string }[]>`
    select c.id from qr_codes c join events e on e.id = c.event_id where e.slug = ${SLUG}`
  const id = creado!.id

  // --- El invitado lo escanea. Sin sesión, como quien está en el salón.
  const invitado = await (await browser.newContext()).newPage()
  const respuesta = await invitado.goto(`/r/${id}`)
  expect(respuesta?.status()).toBe(200)
  expect(invitado.url()).toContain('/es/colecciones')

  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Mesa de regalos' })).toContainText('1 escaneo')

  // --- Se cambia el destino. El código impreso es el mismo y ahora lleva a otro sitio:
  //     eso es todo el motivo del motor.
  const tarjeta = page.getByRole('listitem').filter({ hasText: 'Mesa de regalos' })
  await tarjeta.getByRole('button', { name: 'Editar' }).click()
  // Acotado a la fila: el formulario de alta tiene un campo con el mismo rótulo, y
  // «/es/colecciones» contiene «/es», así que una aserción por texto pasaría sin cambiar
  // nada. Se comprueba contra la base.
  await tarjeta.getByLabel('A dónde lleva').fill('/es/precios')
  await tarjeta.getByRole('button', { name: 'Guardar' }).click()

  await expect
    .poll(async () => (await sql<{ target: string }[]>`select target from qr_codes where id = ${id}`)[0]?.target)
    .toBe('/es/precios')

  await invitado.goto(`/r/${id}`)
  expect(new URL(invitado.url()).pathname).toBe('/es/precios')

  // --- Y apagado deja de llevar a ninguna parte: 404, no la portada.
  await tarjeta.getByRole('button', { name: 'Apagar' }).click()
  await expect(tarjeta).toContainText('Apagado')

  expect((await invitado.goto(`/r/${id}`))?.status()).toBe(404)
})

test('un identificador inventado es 404, no la portada', async ({ browser }) => {
  const nadie = await (await browser.newContext()).newPage()

  expect((await nadie.goto(`/r/${crypto.randomUUID()}`))?.status()).toBe(404)
})
