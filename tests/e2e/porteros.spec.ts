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
  await sembrar(HOY, diaBolivia(0), 'firma-3d')
  await sembrar(MANANA, diaBolivia(2), 'firma-3d')
  await sembrar(SIN_PUERTA, diaBolivia(0), 'atelier')
})

test.afterAll(async () => {
  await sql`delete from events where slug in (${HOY}, ${MANANA}, ${SIN_PUERTA})`
  await sql.end({ timeout: 5 })
})

async function sumarPortero(gestor: import('@playwright/test').Page, slug: string, nombre: string) {
  await gestor.goto(`/panel/eventos/${slug}/equipo`)
  await gestor.getByRole('radio', { name: /Recepción/ }).check()
  await gestor.getByLabel('Nombre').fill(nombre)
  await gestor.getByRole('button', { name: 'Sumar al equipo' }).click()
  const aviso = gestor.getByRole('status').filter({ hasText: 'ya puede entrar' })
  await expect(aviso).toBeVisible()
  const enlace = (await aviso.locator('dd').first().textContent())!.trim()
  const pin = (await aviso.locator('dd').nth(1).textContent())!.trim()
  return { ruta: new URL(enlace).pathname, pin }
}

test('un portero entra con su PIN, registra una llegada, no sale de la puerta y quitarlo lo saca', async ({ browser }) => {
  const gestor = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  const { ruta, pin } = await sumarPortero(gestor, HOY, 'Carlos')
  await expect(gestor.getByText('1 de 3')).toBeVisible()

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

  await portero.getByRole('button', { name: /buscar por nombre/i }).click()
  await portero.getByRole('button', { name: /Familia Rojas/ }).click()
  await expect(portero.getByLabel('Invitaciones que han llegado')).toHaveText('1')

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
  await expect(gestor.getByRole('radio', { name: /Recepción/ })).toBeDisabled()
})
