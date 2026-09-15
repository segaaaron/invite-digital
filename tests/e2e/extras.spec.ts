import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE, AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

const SLUG = 'extras-porteros-e2e'
const SLUG_FIRMA = 'extras-diad-firma-e2e'
const SLUG_ATELIER = 'extras-diad-atelier-e2e'

test.afterAll(async () => {
  await sql`delete from orders where event_id in (select id from events where slug in (${SLUG}, ${SLUG_FIRMA}, ${SLUG_ATELIER}))`
  for (const slug of [SLUG, SLUG_FIRMA, SLUG_ATELIER]) await deleteEvent(slug)
  await sql`update addons set is_active = false where slug in ('mas-3-porteros', 'dia-d')`
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test.setTimeout(120_000)

test('el admin pone a la venta +3 porteros, el evento lo pide y al aprobarse puede sumar porteros', async ({ browser }) => {
  await seedInvitation({ slug: SLUG, plan: 'atelier' })

  // 1. El admin lo pone a la venta.
  const admin = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
  await admin.goto('/panel/admin/extras')
  const extra = admin.getByRole('form', { name: 'Extra +3 porteros' })
  await extra.getByLabel('A la venta').check()
  await extra.getByRole('button', { name: 'Guardar extra' }).click()
  await expect(extra.getByText('Extra guardado.')).toBeVisible({ timeout: 15_000 })

  // 2. Quien lleva el evento lo pide y aterriza en la página de su pedido.
  const atelier = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()
  await atelier.goto(`/panel/eventos/${SLUG}/extras`)
  await atelier.getByRole('button', { name: 'Pedir +3 porteros' }).click()
  await expect(atelier).toHaveURL(/\/es\/pedido\/ref\/[A-Z0-9]{8}$/, { timeout: 60_000 })
  const ref = atelier.url().split('/').pop()!
  const [pedido] = await sql<{ amount: number }[]>`select amount_cents as amount from orders where public_ref = ${ref}`
  expect(pedido!.amount).toBe(8000)

  // 3. Con el comprobante subido, el admin aprueba sin pedir acceso de cliente.
  await sql`update orders set status = 'proof_submitted' where public_ref = ${ref}`
  await admin.goto('/panel/pedidos')
  const tarjeta = admin.locator('section', { hasText: ref }).first()
  await expect(tarjeta.getByLabel(/Correo del cliente/)).toHaveCount(0)
  await tarjeta.getByRole('button', { name: 'Aprobar pago' }).click()
  // Se espera a que el extra esté aplicado en la base, no al texto «Aprobado»: la primera
  // sección con la referencia puede ser una contenedora que ya dice «Aprobado» por otro pedido,
  // y la prueba abría Porteros antes de que terminara la aprobación.
  await expect
    .poll(async () => (await sql<{ n: number }[]>`select count(*)::int as n from event_addons ea join orders o on o.id = ea.order_id where o.public_ref = ${ref}`)[0]!.n, { timeout: 15_000 })
    .toBe(1)

  // 4. El evento, con el plan Atelier, ahora admite tres porteros.
  await atelier.goto(`/panel/eventos/${SLUG}/porteros`)
  await expect(atelier.getByText('0 de 3')).toBeVisible({ timeout: 15_000 })
})

test('el Día D solo se ofrece sobre Firma 3D, y pedirlo dos veces lleva al mismo pedido', async ({ browser }) => {
  await seedInvitation({ slug: SLUG_FIRMA, plan: 'firma-3d' })
  await seedInvitation({ slug: SLUG_ATELIER, plan: 'atelier' })
  await sql`update addons set is_active = true where slug = 'dia-d'`
  const atelier = await (await browser.newContext({ storageState: AUTH_STATE })).newPage()

  // Atelier no lo ve: le regalaría proveedores, cronograma y cortejo.
  await atelier.goto(`/panel/eventos/${SLUG_ATELIER}/extras`)
  await expect(atelier.getByRole('heading', { name: 'Extras' })).toBeVisible()
  await expect(atelier.getByRole('button', { name: /^Pedir Día D/ })).toHaveCount(0)

  // Firma 3D sí, y el segundo «Pedir» aterriza en el pedido que ya estaba abierto.
  const pedir = async () => {
    await atelier.goto(`/panel/eventos/${SLUG_FIRMA}/extras`)
    await atelier.getByRole('button', { name: /^Pedir Día D/ }).click()
    await expect(atelier).toHaveURL(/\/es\/pedido\/ref\/[A-Z0-9]{8}$/, { timeout: 60_000 })
    return atelier.url().split('/').pop()!
  }
  const primero = await pedir()
  expect(await pedir()).toBe(primero)
  const [fila] = await sql<{ n: number }[]>`select count(*)::int as n from orders o join events e on e.id = o.event_id where e.slug = ${SLUG_FIRMA} and o.addon_slug = 'dia-d'`
  expect(fila?.n).toBe(1)
})
