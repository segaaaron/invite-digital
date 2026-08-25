import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { createEvent, createGuestGroup } from './helpers/panel'

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
test('la fila del invitado edita, mueve de grupo, emite el pase y borra', async ({ page }) => {
  await createEvent(page, { slug: SLUG, title: 'Boda acciones e2e' })
  await createGuestGroup(page, SLUG, 'Familia Rojas Peña', 4)
  await createGuestGroup(page, SLUG, 'Padrinos', 2)

  await page.goto(`/panel/eventos/${SLUG}/invitados`)
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
  await page.getByRole('row', { name: /Ana Lucía Vega Rojas/ }).getByRole('link', { name: /^Editar a / }).click()
  await page.getByLabel('Invitado VIP').check()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.waitForURL(/invitados$/)

  const [trasVip] = await sql<{ email: string | null; vip: boolean }[]>`
    select email, vip from guest_people where full_name = 'Ana Lucía Vega Rojas'`
  expect(trasVip?.vip).toBe(true)
  expect(trasVip?.email).toBe('ana@ejemplo.com')

  // --- El pase: no se genera solo, avisa, y al emitirlo enseña el QR.
  await page.getByRole('row', { name: /Ana Lucía Vega Rojas/ }).getByRole('link', { name: /^Ver el pase de / }).click()
  await expect(page.getByText(/deja de servir/)).toBeVisible()
  await page.getByRole('button', { name: 'Generar pase' }).click()
  await expect(page.getByRole('img', { name: /Pase de Familia Rojas Peña/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

  // --- Borrar: pregunta primero, y el segundo clic sí se la lleva.
  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  const suFila = page.getByRole('row', { name: /Ana Lucía Vega Rojas/ })
  await suFila.getByRole('button', { name: /^Eliminar a / }).click()
  await expect(suFila.getByRole('button', { name: 'Confirmar' })).toBeVisible()
  await suFila.getByRole('button', { name: 'Confirmar' }).click()

  await expect(page.getByText('Ana Lucía Vega Rojas')).toHaveCount(0)
})

test('el servidor rechaza mover a alguien a un grupo sin cupo', async ({ page }) => {
  // El corte está en el servidor: el formulario ofrece el grupo lleno igual que la
  // maqueta, y es la Server Action la que dice que no.
  // Su propio grupo de un solo cupo, ya ocupado: el estado que deje el otro test no
  // puede decidir si este prueba algo o no.
  await createGuestGroup(page, SLUG, 'Grupo lleno', 1)
  await page.goto(`/panel/eventos/${SLUG}/invitados`)

  const fila = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Editar a Padrinos' }) })
  await fila.getByRole('link', { name: /^Editar a / }).click()
  const grupo = page.getByLabel('Grupo', { exact: true })
  const lleno = await grupo.locator('option', { hasText: 'Grupo lleno' }).getAttribute('value')
  await grupo.selectOption(lleno)
  await page.getByRole('button', { name: 'Guardar' }).click()

  // Acotado al diálogo: Next monta su propio anunciador de rutas con role="alert".
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('cupos')
})

test('personas y grupos son dos vistas de la misma tarjeta, no dos tablas abiertas a la vez', async ({ page }) => {
  // El evento y su gente los deja la prueba de arriba: aquí solo se mira la forma de la
  // pantalla, y sembrar otro evento costaría cuatro navegaciones para nada.
  await page.goto(`/panel/eventos/${SLUG}/invitados`)

  // Un solo buscador en pantalla. Dos tablas abiertas obligaban a adivinar cuál de los
  // dos era el bueno.
  await expect(page.getByRole('searchbox')).toHaveCount(1)
  await expect(page.getByRole('columnheader', { name: 'Nombre' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Confirmados' })).toHaveCount(0)

  await page.getByRole('link', { name: /^Grupos/ }).click()

  await expect(page).toHaveURL(/vista=grupos/)
  await expect(page.getByRole('searchbox')).toHaveCount(1)
  await expect(page.getByRole('columnheader', { name: 'Confirmados' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Nombre' })).toHaveCount(0)
})
