import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closePeopleDb, deletePeopleEvent, seedPeopleEvent } from './fixtures/personas'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-personas-e2e'

test.afterAll(async () => {
  await deletePeopleEvent(SLUG)
  await closePeopleDb()
})

test('el atelier carga personas dentro del grupo, y el catering ve sus menús', async ({ page }) => {
  await seedPeopleEvent(SLUG)

  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)

  // 1. Una persona con restricción, dentro del grupo sembrado (4 cupos). El alta es el
  // diálogo de la maqueta.
  await page.getByLabel('Nombre completo').fill('Ana Lucía Vega')
  // Dentro del grupo sembrado: el alta empieza en «Invitación propia», que crearía otro.
  await page.getByLabel('Se suma a una invitación ya creada').check()
  await page.getByLabel('Restricciones').fill('Sin gluten')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('cell', { name: 'Ana Lucía Vega', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sin gluten', exact: true })).toBeVisible()

  // 2. El estado se recorre con un clic: pendiente → confirmado.
  // El botón de la fila, no la chip del filtro: se distingue por su título.
  await page.getByRole('button', { name: 'Pendiente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirmado', exact: true })).toBeVisible()

  // 3. La chip VIP, que la maqueta pide y antes no tenía dato. Se marca desde el «✎» de
  // la fila, que es donde la maqueta pone la casilla.
  await page.getByRole('link', { name: 'Editar a Ana Lucía Vega' }).click()
  await page.getByLabel('Invitado VIP').check()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('button', { name: /VIP 1/i })).toBeVisible()

  // 4. El reporte del catering sale de esas restricciones.
  await page.goto(`/panel/eventos/${SLUG}/mesas`)
  await expect(page.getByText('Sin gluten')).toBeVisible()
  await expect(page.getByText('comensales confirmados')).toBeVisible()
})

test('el cupo del grupo es el tope, y el servidor lo dice', async ({ page }) => {
  const slug = `${SLUG}-tope`
  await seedPeopleEvent(slug)

  await page.goto(`/panel/eventos/${slug}/invitados?panel=alta`)

  // El grupo sembrado tiene 4 cupos: la quinta persona no entra.
  for (const nombre of ['Uno', 'Dos', 'Tres', 'Cuatro']) {
    await page.goto(`/panel/eventos/${slug}/invitados?panel=alta`)
    await page.getByLabel('Nombre completo').fill(nombre)
    await page.getByLabel('Se suma a una invitación ya creada').check()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('cell', { name: nombre, exact: true })).toBeVisible()
  }

  await page.goto(`/panel/eventos/${slug}/invitados?panel=alta`)
  await page.getByLabel('Nombre completo').fill('Cinco')
  await page.getByLabel('Se suma a una invitación ya creada').check()
  await page.getByRole('button', { name: 'Guardar' }).click()

  // El anunciador de rutas de Next también es role=alert: el aviso del formulario es el
  // que lleva texto.
  await expect(page.getByRole('alert').filter({ hasText: 'cupos' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Cinco', exact: true })).toHaveCount(0)

  await deletePeopleEvent(slug)
})
