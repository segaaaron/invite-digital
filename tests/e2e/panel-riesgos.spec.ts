import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **Lo del panel del evento que nadie probaba** (13 oct, auditoría de cobertura): revocar una invitación
 * —que su enlace deje de abrir— y registrar a mano un ingreso en «Ingreso al evento», y deshacerlo.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: AUTH_STATE })

test.afterAll(async () => {
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

const personaDe = async (groupId: string) => (await sql<{ id: string }[]>`select id from guest_people where guest_group_id = ${groupId} limit 1`)[0]!.id

test('revocar el enlace de una invitación lo apaga: el invitado ya no la abre', async ({ page, browser }) => {
  const { token, groupId, eventSlug } = await seedInvitation({ slug: 'boda-revocar-e2e', people: ['Ana Vega'] })
  const invitado = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage()
  expect((await invitado.goto(`/i/${token}`))?.status()).toBe(200)

  await page.goto(`/dashboard/events/${eventSlug}/guests?panel=editar&persona=${await personaDe(groupId)}`)
  await page.getByRole('button', { name: 'Revocar enlace' }).click()
  await expect.poll(async () => (await sql`select revoked_at from guest_groups where id = ${groupId}`)[0]?.revoked_at).not.toBeNull()

  expect((await invitado.goto(`/i/${token}`))?.status()).toBe(404)
  await deleteEvent(eventSlug)
})

test('en «Ingreso al evento» se registra a alguien a mano, y se deshace con confirmación', async ({ page }) => {
  const { groupId, eventSlug } = await seedInvitation({ slug: 'boda-ingreso-e2e', people: ['Ana Vega'], plan: 'imperial' })
  const vivas = async () => (await sql<{ n: number }[]>`select count(*)::int as n from arrivals where guest_group_id = ${groupId} and voided_at is null`)[0]!.n

  await page.goto(`/dashboard/events/${eventSlug}/check-in`)
  await page.getByRole('button', { name: 'Registrar a Ana Vega' }).click()
  await expect.poll(vivas).toBe(1)

  // Ya entró: pasa de «Por llegar» (la pestaña de partida) a «Dentro».
  await page.getByRole('region', { name: 'Invitados' }).getByRole('tab', { name: /^Dentro/ }).click()
  await page.getByRole('button', { name: 'Deshacer el ingreso de Ana Vega' }).click()
  await page.getByRole('alert').getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(vivas).toBe(0)
  await deleteEvent(eventSlug)
})
