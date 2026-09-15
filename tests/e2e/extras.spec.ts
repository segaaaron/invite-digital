import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE, AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

const SLUG = 'extras-porteros-e2e'

test.afterAll(async () => {
  await sql`delete from orders where event_id in (select id from events where slug = ${SLUG})`
  await deleteEvent(SLUG)
  await sql`update addons set is_active = false where slug = 'mas-3-porteros'`
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
  await expect(admin.locator('section', { hasText: ref }).first()).toContainText('Aprobado', { timeout: 15_000 })

  // 4. El evento, con el plan Atelier, ahora admite tres porteros.
  await atelier.goto(`/panel/eventos/${SLUG}/porteros`)
  await expect(atelier.getByText('0 de 3')).toBeVisible({ timeout: 15_000 })
})
