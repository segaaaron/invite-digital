import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ATELIER, AUTH_STATE } from './fixtures/atelier'

/**
 * Los porteros de punta a punta: quien gestiona el evento suma a uno, ese portero entra con
 * su enlace y su PIN, registra una llegada y no puede salir de la puerta. Quitarlo lo saca.
 */
const HOY = 'porteros-hoy-e2e'
const MANANA = 'porteros-manana-e2e'
const SIN_PUERTA = 'porteros-atelier-e2e'
const ESCANEO = 'porteros-escaneo-e2e'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

// El día en Bolivia (UTC−4): la ventana del portero se cuenta sobre ese día.
const diaBolivia = (desfaseDias: number) => new Date(Date.now() - 4 * 3_600_000 + desfaseDias * 86_400_000).toISOString().slice(0, 10)

async function sembrar(slug: string, fecha: string, plan: string) {
  await sql`delete from events where slug = ${slug}`
  const [evento] = await sql<{ id: string }[]>`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = ${ATELIER.email}), ${slug}, 'XV de Valeria', ${fecha}, ${fecha}, 'es', 'xv', 'live',
            (select id from plans where slug = ${plan}))
    returning id`
  await sql`insert into guest_groups (event_id, label, seats, token_hash) values (${evento!.id}, 'Familia Rojas', 3, ${Buffer.from(crypto.getRandomValues(new Uint8Array(32)))})`
}

test.beforeAll(async () => {
  await sembrar(HOY, diaBolivia(0), 'imperial')
  await sembrar(MANANA, diaBolivia(2), 'imperial')
  await sembrar(SIN_PUERTA, diaBolivia(0), 'atelier')
  await sembrar(ESCANEO, diaBolivia(0), 'imperial')
})

test.afterAll(async () => {
  await sql`delete from events where slug in (${HOY}, ${MANANA}, ${SIN_PUERTA}, ${ESCANEO})`
  await sql.end({ timeout: 5 })
})

async function sumarPortero(gestor: import('@playwright/test').Page, slug: string, nombre: string) {
  await gestor.goto(`/panel/eventos/${slug}/equipo`)
  await gestor.getByLabel('Nombre').fill(nombre)
  await gestor.getByRole('button', { name: 'Sumar a recepción' }).click()
  const aviso = gestor.getByRole('status').filter({ hasText: 'ya puede entrar' })
  await expect(aviso).toBeVisible()
  const enlace = (await aviso.locator('dd').first().textContent())!.trim()
  const pin = (await aviso.locator('dd').nth(1).textContent())!.trim()
  return { ruta: new URL(enlace).pathname, pin }
}

test('un portero entra con su PIN, registra una llegada, no sale de la puerta y quitarlo lo saca', async ({ browser }) => {
  const gestor = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  const { ruta, pin } = await sumarPortero(gestor, HOY, 'Carlos')
  await expect(gestor.getByText('1 de 10')).toBeVisible()

  const portero = await (await browser.newContext()).newPage()
  await portero.goto(ruta)
  // Sin el PIN no dice de qué evento es.
  await expect(portero.getByText('XV de Valeria')).toHaveCount(0)

  await portero.getByLabel('PIN de 6 dígitos').fill(pin === '000000' ? '111111' : '000000')
  await portero.getByRole('button', { name: 'Entrar a la puerta' }).click()
  await expect(portero.getByRole('alert').filter({ hasText: 'no es correcto' })).toBeVisible()

  await portero.getByLabel('PIN de 6 dígitos').fill(pin)
  await portero.getByRole('button', { name: 'Entrar a la puerta' }).click()
  // Margen largo: la primera vez la página de la puerta se compila en `next dev`.
  await expect(portero).toHaveURL(new RegExp(`${ruta}/puerta$`), { timeout: 20_000 })

  await portero.getByRole('button', { name: /lista de invitados/i }).click()
  await portero.getByRole('button', { name: /Familia Rojas/ }).click()
  await expect(portero.getByLabel('Invitaciones que han llegado')).toHaveText('1')

  // Su lista (9 oct): quién entró y quién falta, sin nada que editar.
  await portero.getByRole('button', { name: 'Siguiente invitado' }).click()
  await portero.getByRole('button', { name: /lista de invitados/i }).click()
  await portero.getByRole('tab', { name: /Dentro · 1/ }).click()
  await expect(portero.getByRole('tabpanel')).toContainText('Familia Rojas')
  await portero.getByRole('button', { name: 'Cerrar' }).click()

  // No sale de la puerta: el panel le pide iniciar sesión.
  await portero.goto(`/panel/eventos/${HOY}/invitados`)
  await expect(portero).toHaveURL(/\/panel\/entrar/)

  // El anfitrión ve quién registró la llegada.
  await gestor.reload()
  await expect(gestor.getByText(/1 invitación registrada/)).toBeVisible()

  // Quitarlo lo saca, aunque tenga la puerta abierta.
  await gestor.getByRole('button', { name: 'Quitar a Carlos' }).click()
  await gestor.getByRole('button', { name: /sí, quitar/i }).click()
  await expect(gestor.getByText('Aún no sumaste a nadie')).toBeVisible()

  await portero.goto(`${ruta}/puerta`)
  await expect(portero).toHaveURL(new RegExp(`${ruta}$`))
  await portero.getByLabel('PIN de 6 dígitos').fill(pin)
  await portero.getByRole('button', { name: 'Entrar a la puerta' }).click()
  await expect(portero.getByRole('alert').filter({ hasText: 'ya no está disponible' })).toBeVisible()
})

test('fuera del día del evento el acceso no abre, ni con el PIN correcto', async ({ browser }) => {
  const gestor = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  const { ruta, pin } = await sumarPortero(gestor, MANANA, 'Ana')

  const portero = await (await browser.newContext()).newPage()
  await portero.goto(ruta)
  await portero.getByLabel('PIN de 6 dígitos').fill(pin)
  await portero.getByRole('button', { name: 'Entrar a la puerta' }).click()
  await expect(portero.getByRole('alert').filter({ hasText: 'día del evento' })).toBeVisible()
})

test('un plan sin puerta no ofrece porteros', async ({ browser }) => {
  const gestor = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  await gestor.goto(`/panel/eventos/${SIN_PUERTA}/equipo`)
  await expect(gestor.getByText(/no incluye pases con QR ni personal de recepción/)).toBeVisible()
  await expect(gestor.getByRole('button', { name: 'Sumar a recepción' })).toHaveCount(0)
})

// 13 oct, sin cobertura hasta hoy: lo que el portero hace toda la noche es escanear, y el mismo pase dos veces
// no puede contar a la familia dos veces.
test('el portero escanea un pase y, si vuelve el mismo, la puerta avisa que ya había ingresado', async ({ browser }) => {
  // Con la forma de un enlace real (16 bytes en base64url): la puerta descarta lo que no la tiene.
  const { createHash, randomBytes } = await import('node:crypto')
  const token = randomBytes(16).toString('base64url')
  const [grupo] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values ((select id from events where slug = ${ESCANEO}), 'Familia Paz', 2, ${createHash('sha256').update(token).digest()})
    returning id`
  const llegadas = async () => (await sql<{ n: number }[]>`select count(*)::int as n from arrivals where guest_group_id = ${grupo!.id} and voided_at is null`)[0]!.n

  const gestor = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  const { ruta, pin } = await sumarPortero(gestor, ESCANEO, 'Lucía')
  // IP propia: el PIN se limita a 5 por minuto e IP, y esta suite entra varias veces.
  const portero = await (await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': '10.99.3.21' } })).newPage()
  await portero.goto(ruta)
  await portero.getByLabel('PIN de 6 dígitos').fill(pin)
  await portero.getByRole('button', { name: 'Entrar a la puerta' }).click()
  await expect(portero).toHaveURL(new RegExp(`${ruta}/puerta$`), { timeout: 20_000 })

  // Con la lista de la puerta ya cargada (el manifiesto): sin ella, el código no se reconoce.
  await expect(portero.getByLabel('Invitaciones que han llegado')).toHaveText('0')
  // Un lector por USB teclea el código y remata con Enter, como una cámara que lo leyó.
  await portero.keyboard.type(token)
  await portero.keyboard.press('Enter')
  await expect(portero.getByText('✓ Bienvenidos')).toBeVisible()
  await expect.poll(llegadas).toBe(1)

  await portero.getByRole('button', { name: 'Siguiente invitado' }).click()
  // La puerta ignora el mismo código unos segundos (la cámara lo lee muchas veces seguidas): el segundo
  // escaneo es otro momento, como la parte de la familia que llega después.
  await portero.waitForTimeout(3_200)
  await portero.keyboard.type(token)
  await portero.keyboard.press('Enter')
  await expect(portero.getByText('! Ya había ingresado')).toBeVisible()
  // Un solo ingreso vivo: el segundo escaneo se une al primero, no suma otra familia.
  await expect.poll(async () => (await sql<{ n: number }[]>`select coalesce(sum(arrived_count), 0)::int as n from arrivals where guest_group_id = ${grupo!.id} and voided_at is null`)[0]!.n).toBeLessThanOrEqual(2)
})


// 13 oct, sin cobertura hasta hoy: en un salón sin señal el portero sigue registrando y sube al volver la red.
test('sin red el portero sigue registrando, y la llegada sube al volver', async ({ browser }) => {
  test.skip(process.env.E2E_DEV === '1', 'Contra la imagen: en `next dev` la recarga en caliente también se corta sin red.')
  const { createHash, randomBytes } = await import('node:crypto')
  const token = randomBytes(16).toString('base64url')
  const [grupo] = await sql<{ id: string }[]>`
    insert into guest_groups (event_id, label, seats, token_hash)
    values ((select id from events where slug = ${ESCANEO}), 'Familia Ríos', 3, ${createHash('sha256').update(token).digest()})
    returning id`
  const llegadas = async () => (await sql<{ n: number }[]>`select count(*)::int as n from arrivals where guest_group_id = ${grupo!.id} and voided_at is null`)[0]!.n

  const gestor = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  const { ruta, pin } = await sumarPortero(gestor, ESCANEO, 'Mateo')
  // IP propia: el PIN se limita a 5 por minuto e IP, y esta suite entra varias veces.
  const contexto = await browser.newContext({ extraHTTPHeaders: { 'x-real-ip': '10.99.3.22' } })
  const portero = await contexto.newPage()
  await portero.goto(ruta)
  await portero.getByLabel('PIN de 6 dígitos').fill(pin)
  await portero.getByRole('button', { name: 'Entrar a la puerta' }).click()
  await expect(portero).toHaveURL(new RegExp(`${ruta}/puerta$`), { timeout: 20_000 })
  await expect(portero.getByLabel('Escaneos por subir')).toHaveText('0')

  await contexto.setOffline(true)
  await portero.keyboard.type(token)
  await portero.keyboard.press('Enter')
  // La bienvenida la decide el aparato, no la red; el escaneo queda en la bandeja.
  await expect(portero.getByText('✓ Bienvenidos')).toBeVisible()
  await expect(portero.getByLabel('Escaneos por subir')).toHaveText(/1/)
  expect(await llegadas()).toBe(0)

  await contexto.setOffline(false)
  await expect(portero.getByLabel('Escaneos por subir')).toHaveText(/^0/, { timeout: 40_000 })
  expect(await llegadas()).toBe(1)
})
