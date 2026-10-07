import { createHash, randomBytes } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

/**
 * **El admin unificado del 28 de septiembre, punta a punta**: cotizar, recordar, perder, cobrar el
 * saldo, cerrar una venta hecha por fuera, crear el evento de un pedido con los extras cotizados,
 * el cliente entero (notas, referido, opinión y testimonio), el informe, Mensajes y agenda,
 * duplicar, ⌘K, la barra del celular y el día del evento en vivo en «Hoy».
 *
 * Conexión propia: compartir la de otra suite deja a la segunda escribiendo contra una cerrada.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

const S = crypto.randomUUID().slice(0, 6)
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const ref = () => Array.from({ length: 8 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
const PREFIJO = `Unif E2E ${S}`
const CLIENTE = { email: `unif-${S}@example.com`, password: 'contrasena-unif-e2e-1', nombre: `Carla ${S}` }
const EVENTO_CLIENTE = `unif-cliente-${S}`
const EVENTO_ADMIN = `unif-admin-${S}`
const EVENTO_HOY = `unif-hoy-${S}`
/** Lo que escribe el cliente en su opinión. El prefijo reconoce las de cualquier corrida al limpiar. */
const PREFIJO_OPINION = 'La invitación encantó a todos'
const OPINION = `${PREFIJO_OPINION} ${S}`

test.use({ storageState: ADMIN_AUTH_STATE })
test.describe.configure({ mode: 'serial' })

let capacidadAntes: string | null = null


test.beforeAll(async () => {
  const [fila] = await sql<{ value: string }[]>`select value from app_settings where key = 'agenda.capacidad'`
  capacidadAntes = fila?.value ?? null

  // El cliente con su cuenta y su evento ya celebrado, como lo deja una venta cerrada.
  const [usuario] = await sql<{ id: string }[]>`
    insert into users (email, password_hash, role, must_change_password, full_name)
    values (${CLIENTE.email}, ${await argon2Hasher.hash(CLIENTE.password)}, 'cliente', false, ${CLIENTE.nombre})
    returning id`
  const [evento] = await sql<{ id: string }[]>`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'admin-e2e@invitepremium.bo'), ${EVENTO_CLIENTE}, ${`Boda de ${CLIENTE.nombre}`}, current_date - 5, current_date - 20, 'es', 'boda-bot', 'live', (select id from plans where slug = 'alta-costura'))
    returning id`
  await sql`insert into event_staff (event_id, user_id, membership) values (${evento!.id}, ${usuario!.id}, 'cliente')`

  // Un evento del atelier para duplicarlo, y otro que se celebra hoy con una invitación confirmada.
  await sql`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'admin-e2e@invitepremium.bo'), ${EVENTO_ADMIN}, ${`${PREFIJO} para duplicar`}, '2027-06-12', '2027-05-20', 'es', 'boda-bot', 'draft', (select id from plans where slug = 'alta-costura'))`
  const [deHoy] = await sql<{ id: string }[]>`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'admin-e2e@invitepremium.bo'), ${EVENTO_HOY}, ${`${PREFIJO} es hoy`}, (now() at time zone 'America/La_Paz')::date, (now() at time zone 'America/La_Paz')::date, 'es', 'boda-bot', 'live', (select id from plans where slug = 'alta-costura'))
    returning id`
  const [grupo] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values (${deHoy!.id}, 'Familia Rojas', 3, ${createHash('sha256').update(randomBytes(16)).digest()})
    returning id`
  await sql`insert into rsvp_responses (guest_group_id, attending) values (${grupo!.id}, 3)`
})

test.afterAll(async () => {
  await sql`delete from event_addons where event_id in (select id from events where title like ${`${PREFIJO}%`} or slug like ${`%-${S}`} or title like ${`%${S}%`})`
  await sql`delete from orders where customer_name like ${`${PREFIJO}%`} or customer_name like ${`%${S}%`}`
  await sql`delete from consultation_requests where name like ${`${PREFIJO}%`}`
  await sql`delete from client_notes where clave like ${`%${S}%`}`
  await sql`delete from events where title like ${`${PREFIJO}%`} or slug like ${`%-${S}`} or title like ${`%${S}%`}`
  await sql`delete from users where email = ${CLIENTE.email}`
  // Si la prueba de la opinión cae entre publicar y restaurar, su testimonio no se queda en La web; y los de
  // corridas anteriores tampoco (restaurar «la versión anterior» del historial podría devolverlos).
  await sql`update app_settings set value = jsonb_set(value::jsonb, '{testimonios}', coalesce((select jsonb_agg(t) from jsonb_array_elements(value::jsonb->'testimonios') t where t->'cita'->>'es' not like ${`${PREFIJO_OPINION}%`}), '[]'::jsonb))::text where key = 'site.settings'`
  if (capacidadAntes === null) await sql`delete from app_settings where key = 'agenda.capacidad'`
  else await sql`update app_settings set value = ${capacidadAntes} where key = 'agenda.capacidad'`
  await sql.end({ timeout: 5 })
})

const ficha = (page: Page) => page.locator('dialog[open]')

test('cotizar, recordar el pago y perder la venta cancelando el pedido', async ({ page }) => {
  const nombre = `${PREFIJO} cotizada`
  await page.goto('/panel/admin/ventas?crear=cotizacion')
  await ficha(page).getByLabel('Nombre', { exact: true }).fill(nombre)
  await ficha(page).getByLabel('WhatsApp o correo').fill('+591 7555 0303')
  await ficha(page).getByRole('button', { name: 'Crear la cotización' }).click()
  const lista = ficha(page).getByText(/Cotización [2-9A-Z]{8} lista/)
  await expect(lista).toBeVisible()
  const referencia = (await lista.locator('b').innerText()).trim()

  await page.goto(`/panel/admin/ventas?venta=p-${referencia}`)
  await expect(ficha(page).getByText('Esperando pago', { exact: true })).toBeVisible()
  const [whatsapp] = await Promise.all([page.waitForEvent('popup'), ficha(page).getByRole('button', { name: /Recordar el pago/ }).click()])
  await whatsapp.close()
  await expect.poll(async () => (await sql`select reminded_at from orders where public_ref = ${referencia}`)[0]?.reminded_at ?? null).not.toBeNull()

  await ficha(page).getByText('Cancelar el pedido y perder la venta').click()
  await ficha(page).getByLabel('Le pareció caro').check()
  await ficha(page).getByRole('button', { name: 'Cancelar y perder' }).click()
  await expect.poll(async () => (await sql<{ status: string }[]>`select status from orders where public_ref = ${referencia}`)[0]?.status).toBe('cancelled')
})

test('una consulta cerrada por fuera crea su evento y queda ganada', async ({ page }) => {
  const nombre = `${PREFIJO} por fuera`
  const [c] = await sql<{ id: string }[]>`
    insert into consultation_requests (name, email, phone, locale, event_date, status)
    values (${nombre}, ${`fuera-${S}@example.com`}, '+591 7555 0404', 'es', '2027-04-17', 'contacted') returning id`
  await page.goto(`/panel/admin/ventas?venta=c-${c!.id}`)
  await ficha(page).getByLabel('Más acciones').click()
  await ficha(page).getByRole('link', { name: 'Ya cerró: crear su evento' }).click()
  await expect(page).toHaveURL(new RegExp(`crear=evento&consulta=${c!.id}`))
  await expect(ficha(page).getByLabel('Nombre del evento')).toHaveValue(nombre)
  await ficha(page).getByLabel('Lo llevo yo, sin acceso del cliente').check()
  await ficha(page).getByRole('button', { name: 'Crear el evento', exact: true }).click()
  await expect(ficha(page).getByText(/Evento creado/)).toBeVisible({ timeout: 20_000 })

  const [ganada] = await sql<{ status: string; event_id: string | null }[]>`select status, event_id from consultation_requests where id = ${c!.id}`
  expect(ganada).toMatchObject({ status: 'won' })
  expect(ganada!.event_id).not.toBeNull()
})

test('el evento de un pedido pagado lleva los extras cotizados y cierra su consulta', async ({ page }) => {
  const nombre = `${PREFIJO} con extras`
  const r = ref()
  const [c] = await sql<{ id: string }[]>`
    insert into consultation_requests (name, email, locale, status) values (${nombre}, ${`extras-${S}@example.com`}, 'es', 'contacted') returning id`
  await sql`
    insert into orders (public_ref, plan_id, customer_name, contact, status, amount_cents, currency, event_date, decided_at, origin, consultation_id, quote_extras)
    values (${r}, (select id from plans where slug = 'atelier'), ${nombre}, ${`extras-${S}@example.com`}, 'approved', 150000, 'BOB', '2027-05-08', now(), 'cotizacion', ${c!.id},
            ${sql.json([{ slug: 'mas-6-meses', name: 'Seis meses más', cents: 9000 }])})`

  await page.goto(`/panel/admin/ventas?venta=p-${r}`)
  await ficha(page).getByRole('link', { name: 'Crear el evento' }).click()
  await expect(page).toHaveURL(new RegExp(`crear=evento&pedido=${r}`))
  await ficha(page).getByLabel('Lo llevo yo, sin acceso del cliente').check()
  await ficha(page).getByRole('button', { name: 'Crear el evento', exact: true }).click()
  await expect(ficha(page).getByText(/Evento creado/)).toBeVisible({ timeout: 20_000 })
  // Creado, no se vuelve a crear: el botón queda deshabilitado (otro clic era un duplicado).
  await expect(ficha(page).getByRole('button', { name: 'Creado ✓' })).toBeDisabled()

  const [pedido] = await sql<{ event_id: string | null }[]>`select event_id from orders where public_ref = ${r}`
  expect(pedido!.event_id).not.toBeNull()
  const extras = await sql<{ addon_slug: string }[]>`select addon_slug from event_addons where event_id = ${pedido!.event_id}`
  expect(extras.map((x) => x.addon_slug)).toEqual(['mas-6-meses'])
  expect((await sql<{ status: string }[]>`select status from consultation_requests where id = ${c!.id}`)[0]?.status).toBe('won')
})

test('el saldo de un pedido con anticipo se registra y la venta queda cerrada', async ({ page }) => {
  const nombre = `${PREFIJO} con saldo`
  const r = ref()
  await sql`
    insert into orders (public_ref, plan_id, customer_name, contact, status, amount_cents, deposit_cents, currency, decided_at, event_id)
    values (${r}, (select id from plans where slug = 'atelier'), ${nombre}, '+591 7555 0505', 'approved', 200000, 100000, 'BOB', now(), (select id from events where slug = ${EVENTO_ADMIN}))`
  await page.goto(`/panel/admin/ventas?venta=p-${r}`)
  await expect(ficha(page).getByText('Saldo pendiente', { exact: true })).toBeVisible()
  await ficha(page).getByRole('button', { name: /Registrar el saldo/ }).click()
  await expect.poll(async () => (await sql`select balance_paid_at from orders where public_ref = ${r}`)[0]?.balance_paid_at ?? null).not.toBeNull()
  await page.reload()
  await expect(ficha(page).getByText('Cerrada', { exact: true })).toBeVisible()
})

test('el cliente entero: etiquetas y nota, su código de recomendación y la compra que trae', async ({ page, browser }) => {
  await page.goto(`/panel/admin/clientes?de=${encodeURIComponent(CLIENTE.email)}`)
  await expect(ficha(page).getByRole('heading', { name: CLIENTE.nombre })).toBeVisible()
  await ficha(page).getByText('VIP', { exact: true }).click()
  await ficha(page).getByLabel('Nota', { exact: true }).fill('Prefiere tonos lila')
  await ficha(page).getByRole('button', { name: 'Guardar' }).first().click()
  await expect(ficha(page).getByText('Guardado.')).toBeVisible()
  await expect.poll(async () => (await sql<{ tags: string[] }[]>`select tags from client_notes where note = 'Prefiere tonos lila' and clave like ${`%${S}%`}`)[0]?.tags).toEqual(['VIP'])

  await ficha(page).getByRole('button', { name: 'Darle su código de recomendación' }).click()
  const codigo = (await ficha(page).getByText(/^Código [2-9A-Z]{6}$/).locator('b').innerText()).trim()

  // Quien llega con el enlace del cliente ve el código puesto en los enlaces de compra y en el pedido.
  const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.60' } })
  const web = await anonimo.newPage()
  await web.goto(`/es?ref=${codigo}`)
  await expect(web.locator(`a[href*="ref=${codigo}"]`).first()).toBeAttached()
  await web.goto(`/es/pedido/atelier?ref=${codigo}`)
  await expect(web.getByLabel('Código de recomendación (si alguien te recomendó)')).toHaveValue(codigo)
  await web.getByLabel('Tu nombre').fill(`${PREFIJO} referida`)
  await web.getByLabel('WhatsApp', { exact: true }).fill('+591 7555 0606')
  await web.getByLabel(/^Correo/).fill('pedido-e2e@ejemplo.bo')
  await web.getByLabel('Fecha del evento').fill('2027-03-20')
  await web.getByRole('button', { name: 'Registrar pedido' }).click()
  await expect(web.getByText(/^[2-9A-Z]{8}$/)).toBeVisible()
  const [pedido] = await sql<{ referral_code: string | null; discount_cents: number | null }[]>`select referral_code, discount_cents from orders where customer_name = ${`${PREFIJO} referida`}`
  expect(pedido!.referral_code).toBe(codigo)
  await anonimo.close()

  await page.reload()
  await expect(ficha(page).getByText('1 compra con su código')).toBeVisible()
})

test('la opinión del cliente llega a su ficha y se publica en la web de un toque', async ({ page, browser }) => {
  const token = randomBytes(24).toString('base64url')
  await sql`insert into event_feedback (event_id, token_hash) values ((select id from events where slug = ${EVENTO_CLIENTE}), ${createHash('sha256').update(token).digest()})`

  const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const web = await anonimo.newPage()
  await web.goto(`/es/opinion/${token}`)
  await web.getByLabel('¡Me encantó!').check({ force: true })
  await web.getByLabel('¿Algo que quieras contarnos?').fill(OPINION)
  await web.getByLabel('Pueden publicar mi opinión en su web, con mi nombre de pila').check()
  await web.getByRole('button', { name: 'Enviar mi opinión' }).click()
  await expect(web.getByText('¡Gracias!')).toBeVisible()
  expect((await web.goto('/es/opinion/enlace-inventado'))?.status()).toBe(404)

  await page.goto(`/panel/admin/clientes?de=${encodeURIComponent(CLIENTE.email)}`)
  await expect(ficha(page).getByText('5 de 5')).toBeVisible()
  await ficha(page).getByRole('button', { name: 'Publicar en la web' }).click()
  // La ficha se repinta y lo dice fijo; y al recargar ya no ofrece publicarla otra vez.
  await expect(ficha(page).getByText('Publicada en la web', { exact: true })).toBeVisible()
  await page.reload()
  await expect(ficha(page).getByText('Publicada en la web', { exact: true })).toBeVisible()
  await expect(ficha(page).getByRole('button', { name: 'Publicar en la web' })).toHaveCount(0)

  await web.goto('/es')
  await expect(web.getByText(OPINION)).toBeVisible()

  // Se deja La web como estaba: se restaura la versión anterior, que también invalida la caché.
  await page.goto('/panel/admin/web')
  await page.getByRole('button', { name: 'Restaurar' }).first().click()
  // La acción remonta el formulario y su aviso se va con él: se comprueba en la web, recargando.
  await expect(async () => {
    await web.goto('/es')
    await expect(web.getByText(OPINION)).toHaveCount(0, { timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  await anonimo.close()
})

test('el cliente abre el informe de su evento', async ({ browser }) => {
  const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.61' } })
  const page = await contexto.newPage()
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(CLIENTE.email)
  await page.getByLabel('Contraseña').fill(CLIENTE.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/panel\/eventos\//)
  expect((await page.goto(`/panel/eventos/${EVENTO_CLIENTE}/informe`))?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: `Boda de ${CLIENTE.nombre}` })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar como PDF' })).toBeVisible()
  await contexto.close()
})

test('Mensajes y agenda guarda la capacidad del día, y el calendario la usa', async ({ page }) => {
  await page.goto('/panel/admin/mensajes')
  await page.getByLabel('Eventos por día').fill('4')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Guardado.')).toBeVisible()
  await expect.poll(async () => (await sql<{ value: string }[]>`select value from app_settings where key = 'agenda.capacidad'`)[0]?.value).toBe('4')

  await page.goto('/panel/admin/eventos/calendario')
  await expect(page.getByText('Tu agenda aguanta 4 eventos por día')).toBeVisible()
})

test('duplicar un evento lleva a la copia, con su diseño y su plan', async ({ page }) => {
  await page.goto(`/panel/eventos/${EVENTO_ADMIN}/configuracion`)
  await page.getByRole('button', { name: 'Duplicar el evento' }).click()
  await expect(page).not.toHaveURL(new RegExp(`/${EVENTO_ADMIN}/`), { timeout: 20_000 })
  await expect(page).toHaveURL(/\/configuracion$/)
  const [copia] = await sql<{ theme_key: string; plan: string }[]>`
    select e.theme_key, p.slug as plan from events e join plans p on p.id = e.plan_id where e.title = ${`${PREFIJO} para duplicar (copia)`}`
  expect(copia).toEqual({ theme_key: 'boda-bot', plan: 'alta-costura' })
})

test('⌘K lleva a una pantalla con solo escribir', async ({ page }) => {
  await page.goto('/panel/admin')
  // El atajo existe cuando la página ha hidratado: se pulsa hasta que abre.
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k')
    await expect(ficha(page).getByRole('searchbox')).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 10_000 })
  await ficha(page).getByRole('searchbox').fill('calendario')
  await ficha(page).getByRole('link', { name: /Ir al Calendario/ }).click()
  await expect(page).toHaveURL(/\/panel\/admin\/eventos\/calendario$/)
})

test('en el celular, la barra de abajo y «Más» llevan a todo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/panel/admin')
  const barra = page.getByRole('navigation', { name: 'Navegación principal' })
  await expect(barra.getByRole('link', { name: 'Ventas' })).toBeVisible()
  await barra.getByRole('button', { name: 'Más' }).click()
  const hoja = page.getByRole('dialog', { name: 'Más secciones' })
  await hoja.getByRole('link', { name: 'Ajustes' }).click()
  await expect(page).toHaveURL(/\/panel\/admin\/usuarios$/)
})

test('el día del evento, «Hoy» cuenta quién entra en vivo, sin recargar', async ({ page }) => {
  await page.goto('/panel/admin')
  const hoy = page.getByRole('region', { name: 'Se celebra hoy' })
  const fila = hoy.getByRole('listitem').filter({ hasText: `${PREFIJO} es hoy` })
  await expect(fila).toContainText('0 de 3 personas dentro')
  await expect(hoy.getByText('En vivo', { exact: true })).toBeVisible({ timeout: 10_000 })

  await sql`
    insert into arrivals (scan_id, guest_group_id, arrived_count, scanned_at, recorded_by)
    values (${crypto.randomUUID()}, (select g.id from guest_groups g join events e on e.id = g.event_id where e.slug = ${EVENTO_HOY}), 2, now(), 'porter:e2e')`
  await expect(fila).toContainText('2 de 3 personas dentro', { timeout: 10_000 })
})

test('la entrada del panel carga su JavaScript: sin bloqueos de la CSP y con «Mostrar» funcionando', async ({ browser }) => {
  // Prerenderizada en el build, sus scripts salían sin el nonce de la CSP y el navegador los bloqueaba.
  const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await anonimo.newPage()
  const bloqueos: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Content Security Policy')) bloqueos.push(m.text())
  })
  await page.goto('/panel/entrar')
  const clave = page.getByLabel('Contraseña')
  await expect(clave).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Mostrar' }).click()
  await expect(clave).toHaveAttribute('type', 'text')
  expect(bloqueos).toEqual([])
  await anonimo.close()
})

test('una dirección que no existe responde el 404 de la web, en su idioma y con su JavaScript', async ({ browser }) => {
  const anonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await anonimo.newPage()
  const bloqueos: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Content Security Policy')) bloqueos.push(m.text())
  })
  expect((await page.goto('/es/no-existe'))?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe')
  await expect(page).toHaveTitle('Esta página no existe · Luxury Atelier')
  expect((await page.goto('/en/nope'))?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist')
  await page.getByRole('link', { name: 'Go home' }).click()
  await expect(page).toHaveURL(/\/en$/)
  expect(bloqueos).toEqual([])
  await anonimo.close()
})
