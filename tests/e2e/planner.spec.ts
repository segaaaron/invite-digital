import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: AUTH_STATE })

test.afterAll(async () => {
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('un evento de XV crea su plan con la plantilla, cierra una tarea y la ve en el resumen', async ({ page }) => {
  const { eventSlug } = await seedInvitation({ slug: 'planner-xv-e2e' })
  // Fecha cercana: la primera etapa ya debería haber pasado. Al sembrar, esas fechas **vencen
  // hoy**, no en el pasado: abrir el plan con quince tareas vencidas hace meses se leía como un
  // error. Así que salen en «Esta semana» y «Atrasadas» queda vacía.
  await sql`update events set theme_key = 'xv-isabelle', event_date = (now() + interval '20 days')::date, rsvp_deadline = (now() + interval '10 days')::date where slug = ${eventSlug}`

  await page.goto(`/panel/eventos/${eventSlug}/planner/tareas`)
  await page.getByRole('button', { name: 'Crear el plan con la plantilla' }).click()

  const vals = page.getByRole('listitem', { name: 'Empezar los ensayos del vals' })
  await expect(vals).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('novios')).toHaveCount(0)

  await vals.getByRole('button', { name: 'Marcar hecha «Empezar los ensayos del vals»' }).click()
  await expect(vals.getByRole('button', { name: 'Reabrir «Empezar los ensayos del vals»' })).toBeVisible()

  await page.goto(`/panel/eventos/${eventSlug}/planner/tareas?filtro=atrasadas`)
  await expect(page.getByText('Nada en este filtro')).toBeVisible()

  await page.goto(`/panel/eventos/${eventSlug}/planner/tareas?filtro=semana`)
  await expect(page.getByRole('listitem', { name: 'Empezar los ensayos del vals' })).toHaveCount(0)
  await expect(page.getByRole('listitem', { name: 'Reservar el salón' })).toBeVisible()

  await page.goto(`/panel/eventos/${eventSlug}`)
  const semana = page.locator('section').filter({ hasText: 'Plan de tareas:' })
  await expect(semana.getByText('Reservar el salón')).toBeVisible()

  await deleteEvent(eventSlug)
})

test('el presupuesto suma una partida de un padrino, su pago y lo marca pagado', async ({ page }) => {
  const { eventSlug } = await seedInvitation({ slug: 'planner-boda-e2e' })
  await sql`update events set theme_key = 'boda-bot' where slug = ${eventSlug}`

  await page.goto(`/panel/eventos/${eventSlug}/planner/presupuesto?panel=partida`)
  await page.getByLabel('Concepto').fill('Torta de tres pisos')
  await page.getByLabel('Categoría').selectOption('torta')
  await page.getByLabel('Previsto (Bs)').fill('mil quinientos')
  await page.getByLabel('Quién paga').selectOption('padrino')
  await page.getByLabel('Qué padrino').fill('Tío Jorge')
  await page.getByRole('button', { name: 'Sumar partida' }).last().click()

  // Un importe mal escrito no borra lo demás.
  await expect(page.getByRole('alert').filter({ hasText: 'No es un importe' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Concepto')).toHaveValue('Torta de tres pisos')
  await expect(page.getByLabel('Qué padrino')).toHaveValue('Tío Jorge')

  await page.getByLabel('Previsto (Bs)').fill('1500')
  await page.getByRole('button', { name: 'Sumar partida' }).last().click()

  const partida = page.getByRole('listitem', { name: 'Torta de tres pisos' })
  await expect(partida).toBeVisible({ timeout: 15_000 })
  await expect(partida.getByText('Paga: Padrino · Tío Jorge')).toBeVisible()

  await partida.getByText('Pagos, editar o quitar').click()
  await partida.getByLabel('Importe (Bs)').fill('500')
  await partida.getByRole('button', { name: 'Sumar pago a Torta de tres pisos' }).click()
  await partida.getByRole('button', { name: /^Marcar pagado/ }).click()

  await expect(partida.getByRole('button', { name: /^Desmarcar pago/ })).toBeVisible()
  await expect(page.getByText('Padrino · Tío Jorge').last()).toBeVisible()
  const [fila] = await sql<{ pagado: number }[]>`
    select coalesce(sum(p.amount_cents), 0)::int as pagado
    from budget_payments p join budget_items i on i.id = p.item_id join events e on e.id = i.event_id
    where e.slug = ${eventSlug} and p.paid_at is not null`
  expect(fila!.pagado).toBe(500_00)

  await deleteEvent(eventSlug)
})
