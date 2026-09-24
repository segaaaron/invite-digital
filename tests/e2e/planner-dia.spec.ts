import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'
import { elegirFecha } from './helpers/panel'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: AUTH_STATE })
test.describe.configure({ mode: 'serial' })

const SLUG = 'planner-dia-xv-e2e'

test.beforeAll(async () => {
  await seedInvitation({ slug: SLUG, plan: 'alta-costura' })
  await sql`update events set theme_key = 'xv-isabelle' where slug = ${SLUG}`
})

test.afterAll(async () => {
  await deleteEvent(SLUG)
  await deleteEvent('planner-dia-atelier-e2e')
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('un proveedor con precio nace con su partida, entra al cronograma y ve su parte con su enlace', async ({ page, browser }) => {
  await page.goto(`/panel/eventos/${SLUG}/planner/proveedores?panel=proveedor`)
  await page.getByLabel('Servicio').fill('DJ')
  await page.getByLabel('Empresa').fill('Beat')
  await page.getByLabel('Precio (Bs) · crea su partida').fill('3500')
  await page.getByLabel('Categoría del presupuesto').selectOption('dj')
  await page.getByLabel('Llega el día a las').selectOption('17:30')
  await page.getByLabel('Estado').selectOption('contratado')
  await page.getByRole('button', { name: 'Sumar proveedor' }).click()

  const dj = page.getByRole('listitem', { name: 'DJ' })
  await expect(dj).toContainText('pagado', { timeout: 15_000 })
  const [partida] = await sql<{ concept: string; contracted: number }[]>`
    select i.concept, i.contracted_cents as contracted from budget_items i join events e on e.id = i.event_id where e.slug = ${SLUG}`
  expect(partida).toEqual({ concept: 'DJ · Beat', contracted: 3_500_00 })

  // El cronograma empieza vacío: el momento se suma a mano, en su modal, con el DJ y su canción.
  await page.goto(`/panel/eventos/${SLUG}/planner/cronograma?momento=nuevo`)
  const modal = page.getByRole('dialog', { name: 'Nuevo momento' })
  await modal.getByLabel('Hora', { exact: true }).selectOption('20:00')
  await modal.getByLabel('Momento').fill('Vals con el papá')
  await modal.getByText('Para tu equipo').click()
  await modal.getByLabel('Duración (minutos)').fill('10')
  await modal.getByText('DJ', { exact: true }).click()
  await modal.getByLabel('Canción o señal').fill('Tiempo de vals')
  await modal.getByRole('button', { name: 'Sumar momento' }).click()
  const vals = page.getByRole('listitem', { name: '20:00 Vals con el papá' })
  await expect(vals).toContainText('♪ Tiempo de vals', { timeout: 15_000 })
  await expect(vals).toContainText('En la invitación')

  // Su enlace, una vez.
  await page.goto(`/panel/eventos/${SLUG}/planner/proveedores`)
  const tarjeta = page.getByRole('listitem', { name: 'DJ' })
  await tarjeta.getByText('Estado, enlace, editar o quitar').click()
  await tarjeta.getByRole('button', { name: 'Crear el enlace de DJ' }).click()
  const enlace = (await tarjeta.getByLabel('Enlace del proveedor').textContent({ timeout: 15_000 }))!.trim()
  const ruta = new URL(enlace).pathname

  const ajeno = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const proveedor = await ajeno.newPage()
  await proveedor.goto(ruta)
  await expect(proveedor.getByText('Llegas a las 17:30')).toBeVisible()
  await expect(proveedor.getByText('Vals con el papá')).toBeVisible()
  await expect(proveedor.getByText('Cambio de zapatillas')).toHaveCount(0)
  expect((await proveedor.goto('/v/enlace-inventado'))?.status()).toBe(404)
  await ajeno.close()
})

test('el cortejo de XV suma un chambelán con su talla y un ensayo del vals', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/planner/cortejo?panel=miembro`)
  await expect(page.getByLabel('Papel').first().locator('option')).toHaveText(['Padrino', 'Chambelán', 'Corte de honor'])
  await page.getByLabel('Papel').first().selectOption('chambelan')
  await page.getByLabel('Nombre').first().fill('Diego Rojas')
  await page.getByLabel('Talla').first().fill('M')
  await page.getByRole('button', { name: 'Sumar al cortejo' }).last().click()
  const diego = page.getByRole('listitem', { name: 'Diego Rojas' })
  await expect(diego).toContainText('talla M', { timeout: 15_000 })

  await elegirFecha(page, 'Fecha y hora', '2027-04-10')
  await page.getByLabel('Hora', { exact: true }).last().selectOption('19:00')
  await page.getByRole('checkbox', { name: 'Diego Rojas' }).check()
  await page.getByRole('button', { name: 'Sumar ensayo' }).click()
  await expect(page.getByRole('button', { name: /^Quitar el ensayo del/ })).toBeVisible({ timeout: 15_000 })
  const [ensayo] = await sql<{ n: number }[]>`
    select count(*)::int as n from rehearsal_attendees a join rehearsals r on r.id = a.rehearsal_id join events e on e.id = r.event_id where e.slug = ${SLUG}`
  expect(ensayo!.n).toBe(1)
})

test('el Día D dice quién falta por llegar y marca al DJ', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/dia-d`)
  await expect(page.getByRole('heading', { name: 'Día D' })).toBeVisible()
  await page.getByRole('button', { name: 'Llegó DJ' }).click()
  await expect(page.getByText('Llegaron todos.')).toBeVisible({ timeout: 15_000 })
})

test('un contrato en PDF se guarda privado y se descarga como adjunto, nunca en línea', async ({ page, browser }) => {
  await page.goto(`/panel/eventos/${SLUG}/planner/documentos`)
  // Se suelta en la tarjeta del proveedor —o se toca para elegir— y sube solo, sin formulario.
  await page.getByRole('region', { name: 'Subir un documento' }).locator('input[type=file]').setInputFiles({ name: 'contrato-dj.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%contrato del DJ\n') })
  const enlace = page.getByRole('link', { name: 'contrato-dj.pdf' })
  await expect(enlace).toBeVisible({ timeout: 15_000 })

  const href = (await enlace.getAttribute('href'))!
  const respuesta = await page.request.get(href)
  expect(respuesta.status()).toBe(200)
  expect(respuesta.headers()['content-disposition']).toContain('attachment')
  expect(respuesta.headers()['content-security-policy']).toBe('sandbox')

  const ajeno = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const sinSesion = await ajeno.request.get(href, { maxRedirects: 0 })
  expect(sinSesion.status()).not.toBe(200)
  await ajeno.close()
})

test('con el plan Atelier, proveedores dice qué plan los trae y el servidor no guarda', async ({ page }) => {
  await seedInvitation({ slug: 'planner-dia-atelier-e2e', plan: 'atelier' })
  await page.goto('/panel/eventos/planner-dia-atelier-e2e/planner/proveedores')
  await expect(page.getByText('Los proveedores, el cronograma y el cortejo vienen con Firma 3D y Alta Costura.')).toBeVisible()
})
