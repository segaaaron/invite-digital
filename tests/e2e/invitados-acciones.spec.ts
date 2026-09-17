import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { createEvent, createGuestGroup, desplegarInvitacion } from './helpers/panel'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-acciones-e2e'

// Conexión propia: compartir la de `fixtures/db` deja a la otra suite escribiendo contra
// una conexión ya cerrada en cuanto el primer `afterAll` la cierra.
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

test.beforeAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
})

test.afterAll(async () => {
  await sql`delete from events where slug = ${SLUG}`
  await sql.end({ timeout: 5 })
})

/**
 * Las tres acciones de fila de la maqueta, contra la base de verdad.
 *
 * Las tres viven detrás de un icono y de un parámetro de la dirección; ninguna es
 * alcanzable por texto, así que un cambio de rótulo no las tapa.
 */
test('la fila del invitado edita, enseña su pase y borra', async ({ page }) => {
  await createEvent(page, { slug: SLUG, title: 'Boda acciones e2e' })
  await createGuestGroup(page, SLUG, 'Familia Rojas Peña', 4)
  await createGuestGroup(page, SLUG, 'Padrinos', 2)

  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  // Cuatro personas: la invitación nace plegada y sus personas no están en el DOM hasta abrirla.
  await desplegarInvitacion(page, 'Familia Rojas Peña')
  const fila = page.getByRole('row', { name: /Familia Rojas Peña/ }).first()

  // --- Editar: nombre, restricción y correo, en el diálogo de la maqueta.
  await fila.getByRole('link', { name: /^Editar a / }).click()
  await expect(page.getByRole('heading', { name: 'Editar invitado' })).toBeVisible()
  await page.getByLabel('Nombre completo').fill('Ana Lucía Vega Rojas')
  await page.getByLabel('Restricciones').fill('Sin gluten')
  await page.getByLabel('Email').fill('ana@ejemplo.com')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await page.waitForURL(/invitados$/)
  await expect(page.getByText('Ana Lucía Vega Rojas')).toBeVisible()
  await expect(page.getByText('Sin gluten')).toBeVisible()

  // El correo se guardó de verdad: es el campo que `updatePerson` borraba en silencio.
  const [guardada] = await sql<{ email: string | null }[]>`
    select email from guest_people where full_name = 'Ana Lucía Vega Rojas'`
  expect(guardada?.email).toBe('ana@ejemplo.com')

  // --- Editar otra vez: marcar VIP no puede llevarse el correo por delante.
  // Guardar volvió a la lista, y la invitación —renombrada con su principal— vuelve plegada.
  await desplegarInvitacion(page, 'Ana Lucía Vega Rojas')
  await page.getByRole('row', { name: /Ana Lucía Vega Rojas/ }).getByRole('link', { name: /^Editar a / }).click()
  await page.getByLabel('Invitado VIP').check()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.waitForURL(/invitados$/)

  const [trasVip] = await sql<{ email: string | null; vip: boolean }[]>`
    select email, vip from guest_people where full_name = 'Ana Lucía Vega Rojas'`
  expect(trasVip?.vip).toBe(true)
  expect(trasVip?.email).toBe('ana@ejemplo.com')

  // --- El pase: enseña el QR que ya tiene, sin generar nada.
  await desplegarInvitacion(page, 'Ana Lucía Vega Rojas')
  await page.getByRole('row', { name: /Ana Lucía Vega Rojas/ }).getByRole('link', { name: /^Ver el pase de / }).click()
  await expect(page.getByRole('button', { name: /generar/i })).toHaveCount(0)
  // La invitación se llama como su principal, y al renombrarlo se renombró con él.
  await expect(page.getByRole('img', { name: /Pase de Ana Lucía Vega Rojas/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

  // --- Borrar: pregunta primero, y el segundo clic sí se la lleva.
  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  await desplegarInvitacion(page, 'Ana Lucía Vega Rojas')
  const suFila = page.getByRole('row', { name: /Ana Lucía Vega Rojas/ })
  await suFila.getByRole('button', { name: /^Eliminar a / }).click()
  await expect(suFila.getByRole('button', { name: 'Confirmar' })).toBeVisible()
  await suFila.getByRole('button', { name: 'Confirmar' }).click()

  await expect(page.getByText('Ana Lucía Vega Rojas')).toHaveCount(0)
})

test('mover a alguien a una invitación llena le suma el cupo, y la de origen pasa a su acompañante', async ({ page }) => {
  // Su propia invitación de un solo cupo, ya ocupado: el estado que deje el otro test no
  // puede decidir si este prueba algo o no.
  await createGuestGroup(page, SLUG, 'Grupo lleno', 1)
  await page.goto(`/panel/eventos/${SLUG}/invitados`)

  // «Padrinos» son dos personas: su invitación va plegada.
  await desplegarInvitacion(page, 'Padrinos')
  const fila = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Editar a Padrinos' }) })
  await fila.getByRole('link', { name: /^Editar a / }).click()
  const invitacion = page.getByLabel('Invitación', { exact: true })
  const llena = await invitacion.locator('option', { hasText: 'Grupo lleno' }).getAttribute('value')
  await invitacion.selectOption(llena)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.waitForURL(/invitados$/)

  const [destino] = await sql<{ seats: number }[]>`select seats from guest_groups where id = ${llena!}`
  expect(destino?.seats).toBe(2)
  // «Padrinos» (2 cupos) se quedó con su acompañante, que pasa a principal y le da nombre.
  const invitaciones = await sql<{ label: string; seats: number }[]>`
    select g.label, g.seats from guest_groups g join events e on e.id = g.event_id where e.slug = ${SLUG}`
  expect(invitaciones.map((i) => i.label)).not.toContain('Padrinos')
  expect(invitaciones).toContainEqual({ label: 'Acompañante 1', seats: 2 })
})
