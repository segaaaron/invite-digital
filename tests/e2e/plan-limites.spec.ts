import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { invitationFixtures } from './fixtures/invitation'
import { abrirSeccion } from './helpers/panel'

const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.use({ storageState: AUTH_STATE })

test.afterAll(async () => {
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

// El corte está en el servidor: la pantalla deja elegir el archivo y es la acción la que dice que no.
test('con las fotos del plan agotadas, subir otra se rechaza y lo dice', async ({ page }) => {
  const { eventSlug } = await seedInvitation({ slug: 'plan-fotos-e2e', plan: 'atelier' })
  const [plan] = await sql<{ max: number }[]>`select max_gallery_photos as max from plans where slug = 'atelier'`
  const [evento] = await sql<{ id: string }[]>`select id from events where slug = ${eventSlug}`
  for (let i = 0; i < plan!.max; i++) {
    await sql`insert into event_media (event_id, content_type, original_name, byte_size) values (${evento!.id}, 'image/webp', ${`foto-${i}.webp`}, 10)`
  }

  // Las fotos se suben desde el campo que las pide (desde el 16 de septiembre ya no hay tarjeta
  // de fotos aparte): la galería de «Botánica», como en `panel.spec`.
  await sql`update events set theme_key = 'boda-bot' where id = ${evento!.id}`
  await page.goto(`/panel/eventos/${eventSlug}/configuracion`)
  const galeria = await abrirSeccion(page, 'Galería')
  await galeria.getByRole('button', { name: 'Añadir casilla' }).click()
  await galeria.getByRole('button', { name: 'Subir una fotografía' }).click()
  const subida = page.locator('dialog[open]')
  await subida.getByLabel('Elegir fotografía').setInputFiles({ name: 'una-mas.png', mimeType: 'image/png', buffer: PNG })
  await subida.getByRole('button', { name: 'Subir', exact: true }).click()

  await expect(subida.getByRole('alert').filter({ hasText: 'Ya subiste todas las fotos que incluye tu plan' })).toBeVisible()
  const [cuenta] = await sql<{ n: number }[]>`select count(*)::int as n from event_media where event_id = ${evento!.id}`
  expect(cuenta!.n).toBe(plan!.max)

  await deleteEvent(eventSlug)
})

test('un plan sin cambio de modelo lo enseña fijo, y un POST con otro modelo no lo cambia', async ({ page }) => {
  const { eventSlug } = await seedInvitation({ slug: 'plan-modelo-e2e', plan: 'atelier' })
  await sql`update events set theme_key = 'boda-bot' where slug = ${eventSlug}`

  await page.goto(`/panel/eventos/${eventSlug}/configuracion`)
  await expect(page.getByText('Tu plan no incluye cambiar de modelo.')).toBeVisible()

  // Se reescribe el campo oculto desde el navegador, como haría quien manipula el formulario.
  await page.locator('input[type=hidden][name=themeKey]').evaluate((campo) => {
    ;(campo as HTMLInputElement).value = 'boda-ed'
  })
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Evento guardado.')).toBeVisible({ timeout: 15_000 })

  const [fila] = await sql<{ theme: string }[]>`select theme_key as theme from events where slug = ${eventSlug}`
  expect(fila!.theme).toBe('boda-bot')

  await deleteEvent(eventSlug)
})
