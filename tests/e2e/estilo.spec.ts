import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import postgres from 'postgres'
import { CLIENTE, closeClienteDb, deleteClienteFixture, seedCliente } from './fixtures/cliente'

/** Cuenta propia: el límite de intentos es por cuenta y otras suites entran con `CLIENTE`. */
const CUENTA = { email: 'cliente-estilo-e2e@invitepremium.bo', password: CLIENTE.password }

/**
 * Colores y letra (Gala, `0088`): sin el plan, la tarjeta lo dice y el servidor no guarda aunque el
 * formulario llegue; con él, el cliente elige el acento y la caligrafía y la invitación los pinta.
 * Plan propio, copia de `imperial`, para no tocar los de verdad.
 */
const SLUG = 'boda-estilo-e2e'
const PLAN = 'gala-estilo-e2e'
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const conEstilo = (si: boolean) => sql`update plans set includes_style = ${si} where slug = ${PLAN}`

test.describe.configure({ mode: 'serial' })

test.describe('colores y letra', () => {
  let ctx: BrowserContext
  let page: Page
  let token: string

  test.beforeAll(async ({ browser }) => {
    await sql`delete from plans where slug = ${PLAN}`
    await sql`
      insert into plans
      select (jsonb_populate_record(null::plans, to_jsonb(p) || jsonb_build_object('id', gen_random_uuid(), 'slug', ${PLAN}::text, 'is_active', false, 'includes_style', false))).*
      from plans p where p.slug = 'imperial'`
    token = (await seedCliente(SLUG, CUENTA)).token
    await sql`update events set theme_key = 'boda-bot', plan_id = (select id from plans where slug = ${PLAN}) where slug = ${SLUG}`
    ctx = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { 'x-real-ip': '10.99.0.81' } })
    page = await ctx.newPage()
    await page.goto('/panel/entrar')
    await page.getByLabel('Correo').fill(CUENTA.email)
    await page.getByLabel('Contraseña').fill(CUENTA.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/panel\/eventos\//)
  })

  test.afterAll(async () => {
    await ctx?.close()
    await deleteClienteFixture(SLUG, CUENTA)
    await sql`delete from plans where slug = ${PLAN}`
    await closeClienteDb()
    await sql.end({ timeout: 5 })
  })

  test('sin el plan, la tarjeta lo dice', async () => {
    await page.goto(`/panel/eventos/${SLUG}/configuracion`)
    await expect(page.getByText(/En Gala e Imperial eliges el color/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar colores y letra' })).toHaveCount(0)
  })

  test('el servidor no guarda si el plan ya no lo trae, aunque el formulario esté abierto', async () => {
    await conEstilo(true)
    await page.reload()
    await page.getByRole('radio', { name: 'Borgoña' }).check()
    await conEstilo(false)
    await page.getByRole('button', { name: 'Guardar colores y letra' }).click()
    await expect(page.getByText('Tu plan no incluye elegir los colores y la letra.')).toBeVisible()
    const filas = await sql`select 1 from event_styles where event_id = (select id from events where slug = ${SLUG})`
    expect(filas).toHaveLength(0)
  })

  test('con el plan, se guarda y la invitación lo pinta', async ({ browser }) => {
    await conEstilo(true)
    await page.reload()
    await page.getByRole('radio', { name: 'Borgoña' }).check()
    await page.getByRole('radio', { name: 'Allura' }).check()
    await page.getByRole('button', { name: 'Guardar colores y letra' }).click()
    await expect(async () => {
      const [fila] = await sql<{ accent: string; script_font: string }[]>`select accent, script_font from event_styles where event_id = (select id from events where slug = ${SLUG})`
      expect(fila).toEqual({ accent: '#7a2335', script_font: 'allura' })
    }).toPass({ timeout: 10_000 })

    const invitado = await (await browser.newContext()).newPage()
    await invitado.goto(`/i/${token}`)
    const html = await invitado.content()
    expect(html).toContain('--acento-salvia:#7a2335')
    expect(html).toContain('--font-great-vibes:var(--font-allura)')
    await invitado.context().close()
  })
})
