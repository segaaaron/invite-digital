import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

/**
 * **Lo que el admin hace y nadie probaba** (13 oct, auditoría de cobertura): dar de alta, cambiar el rol y
 * borrar a alguien del equipo; rechazar un comprobante (que rechazar no termine aprobando); editar un plan;
 * cambiar el plan de un evento; borrar la cuenta de un cliente y borrar un evento escribiendo su nombre.
 *
 * Todo con datos propios de la corrida (sufijo `S`): el plan es uno de prueba, nunca los que se venden.
 * Conexión propia: compartir la de otra suite deja a la segunda escribiendo contra una cerrada.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

const S = crypto.randomUUID().slice(0, 6)
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const ref = () => Array.from({ length: 8 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
const EQUIPO = `equipo-riesgo-${S}@example.com`
const CLIENTE = { email: `cliente-riesgo-${S}@example.com`, nombre: `Rocío Riesgo ${S}` }
const EVENTO = `riesgo-admin-${S}`
const TITULO = `Boda riesgo ${S}`
const PLAN = `e2e-plan-${S}`
const PEDIDO = { ref: ref(), nombre: `Pedido riesgo ${S}` }

test.use({ storageState: ADMIN_AUTH_STATE })
test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  // El evento, de un atelier, con el plan más barato.
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${EVENTO}, ${TITULO}, '2027-09-18', '2027-09-01', 'es', 'boda-sello', 'live',
            (select id from plans where slug = 'atelier'))`
  // Un plan de prueba, copia del más barato y retirado: editarlo no toca lo que se vende.
  await sql`
    insert into plans (slug, price_cents, currency, highlighted, sort_order, is_active, max_guest_groups, includes_seating, includes_registry, includes_checkin,
                       max_door_porters, max_gallery_photos, guest_photos, event_password, csv_import, online_days, design_change, planner_suite, deposit_pct,
                       includes_guestbook, includes_gift_ways, includes_style)
    select ${PLAN}, price_cents, currency, false, 99, false, max_guest_groups, includes_seating, includes_registry, includes_checkin,
           max_door_porters, max_gallery_photos, guest_photos, event_password, csv_import, online_days, design_change, planner_suite, deposit_pct,
           includes_guestbook, includes_gift_ways, includes_style
    from plans where slug = 'atelier'`
  await sql`
    insert into plan_translations (plan_id, locale, name, tagline, description, features)
    select (select id from plans where slug = ${PLAN}), locale, ${`Plan prueba ${S}`}, tagline, description, features
    from plan_translations where plan_id = (select id from plans where slug = 'atelier')`
  // Un pedido con su comprobante enviado, esperando decisión.
  await sql`
    insert into orders (public_ref, plan_id, customer_name, contact, status, amount_cents, currency, event_date, email)
    values (${PEDIDO.ref}, (select id from plans where slug = 'atelier'), ${PEDIDO.nombre}, '+59170044433', 'proof_submitted', 49000, 'BOB', '2027-10-02',
            ${`pedido-riesgo-${S}@example.com`})`
  // Un cliente con su cuenta, sin eventos: su ficha ofrece borrarla.
  await sql`
    insert into users (email, password_hash, role, must_change_password, full_name)
    values (${CLIENTE.email}, ${await argon2Hasher.hash('contrasena-riesgo-e2e-1')}, 'cliente', false, ${CLIENTE.nombre})`
})

test.afterAll(async () => {
  await sql`delete from orders where public_ref = ${PEDIDO.ref}`
  await sql`delete from events where slug = ${EVENTO}`
  await sql`delete from plan_translations where plan_id = (select id from plans where slug = ${PLAN})`
  await sql`delete from plans where slug = ${PLAN}`
  await sql`delete from users where email in (${EQUIPO}, ${CLIENTE.email})`
  await sql.end({ timeout: 5 })
})

test('equipo: da de alta a una persona, la hace administradora y le quita el rol, y la borra', async ({ page }) => {
  await page.goto('/dashboard/admin/users?crear=persona')
  await page.getByLabel('Correo').fill(EQUIPO)
  await page.getByRole('button', { name: 'Crear usuario' }).click()
  await expect.poll(async () => (await sql`select role from users where email = ${EQUIPO}`)[0]?.role).toBe('atelier')

  await page.goto('/dashboard/admin/users')
  const fila = page.getByRole('listitem').filter({ hasText: EQUIPO })
  await fila.getByLabel(`Más acciones de ${EQUIPO}`).click()
  await fila.getByRole('button', { name: 'Hacer administrador' }).click()
  await expect.poll(async () => (await sql`select role from users where email = ${EQUIPO}`)[0]?.role).toBe('admin')

  await page.reload()
  await fila.getByLabel(`Más acciones de ${EQUIPO}`).click()
  await fila.getByRole('button', { name: 'Quitar el rol de administrador' }).click()
  await expect.poll(async () => (await sql`select role from users where email = ${EQUIPO}`)[0]?.role).toBe('atelier')

  await page.reload()
  await fila.getByLabel(`Más acciones de ${EQUIPO}`).click()
  await fila.getByRole('button', { name: 'Borrar la cuenta' }).click()
  await page.locator('dialog[open]').getByRole('button', { name: 'Borrar usuario' }).click()
  await expect.poll(async () => (await sql`select count(*)::int as n from users where email = ${EQUIPO}`)[0]?.n).toBe(0)
})

test('rechazar un comprobante lo rechaza con su motivo y su nota: no termina aprobando', async ({ page }) => {
  await page.goto(`/dashboard/admin/sales?venta=p-${PEDIDO.ref}`)
  const ficha = page.locator('section[aria-labelledby="ficha-de-venta"]')
  await ficha.getByRole('button', { name: 'Rechazar', exact: true }).click()
  const dialogo = page.locator('dialog[open]')
  await dialogo.getByLabel('El monto no coincide').check()
  await dialogo.getByLabel(/^Nota para/).fill('Llegaron Bs 300; sube el comprobante de lo que falta.')
  await dialogo.getByRole('button', { name: 'Rechazar y avisarle' }).click()

  await expect
    .poll(async () => (await sql<{ status: string; decision_note: string | null }[]>`select status, decision_note from orders where public_ref = ${PEDIDO.ref}`)[0])
    .toEqual({ status: 'rejected', decision_note: 'El monto no coincide. Llegaron Bs 300; sube el comprobante de lo que falta.' })
  // Ni cuenta ni evento: rechazar no aprovisiona nada.
  expect((await sql`select event_id from orders where public_ref = ${PEDIDO.ref}`)[0]?.event_id).toBeNull()
})

test('editar un plan guarda su precio y sus días en línea', async ({ page }) => {
  await page.goto(`/dashboard/admin/plans?plan=${PLAN}`)
  const editor = page.getByRole('form', { name: `Plan Plan prueba ${S}` })
  await editor.getByLabel('Precio', { exact: true }).fill('512')
  await editor.getByLabel('En línea tras la fiesta').fill('75')
  await editor.getByRole('button', { name: 'Guardar plan' }).click()
  await expect
    .poll(async () => (await sql<{ price_cents: number; online_days: number }[]>`select price_cents, online_days from plans where slug = ${PLAN}`)[0])
    .toEqual({ price_cents: 51200, online_days: 75 })
})

test('el admin cambia el plan del evento desde su ficha', async ({ page }) => {
  await page.goto(`/dashboard/events/${EVENTO}/setup`)
  await page.getByLabel('Plan del evento').selectOption('gala')
  await page.getByRole('button', { name: 'Cambiar plan' }).click()
  await expect.poll(async () => (await sql`select p.slug from events e join plans p on p.id = e.plan_id where e.slug = ${EVENTO}`)[0]?.slug).toBe('gala')
})

test('borra la cuenta de un cliente desde su ficha', async ({ page }) => {
  await page.goto(`/dashboard/admin/clients?q=${encodeURIComponent(CLIENTE.email)}`)
  await page.getByRole('region', { name: 'Lista de clientes' }).getByRole('link', { name: new RegExp(CLIENTE.nombre) }).click()
  const ficha = page.locator('section[aria-labelledby="ficha-de-cliente"]')
  // Lo destructivo va plegado, dentro de «Sus eventos, referidos y cuenta».
  await ficha.getByText('Sus eventos, referidos y cuenta').click()
  await ficha.getByRole('button', { name: 'Borrar su cuenta' }).click()
  await page.locator('dialog[open]').getByRole('button', { name: 'Borrar la cuenta' }).click()
  await expect.poll(async () => (await sql`select count(*)::int as n from users where email = ${CLIENTE.email}`)[0]?.n).toBe(0)
})

test('borrar un evento pide escribir su nombre, y entonces lo borra', async ({ page }) => {
  await page.goto(`/dashboard/events/${EVENTO}/setup`)
  await page.getByRole('button', { name: 'Borrar evento' }).click()
  const dialogo = page.locator('dialog[open]')
  const confirmar = dialogo.getByRole('button', { name: 'Borrar para siempre' })
  await expect(confirmar).toBeDisabled()
  await dialogo.getByLabel('Para confirmar, escribe el nombre del evento').fill(TITULO)
  await confirmar.click()
  await expect.poll(async () => (await sql`select count(*)::int as n from events where slug = ${EVENTO}`)[0]?.n).toBe(0)
})
