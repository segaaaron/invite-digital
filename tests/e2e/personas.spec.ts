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

  // 1. Una persona con restricción, dentro del grupo sembrado (4 cupos).
  await page.getByLabel('Nombre de la persona').fill('Ana Lucía Vega')
  await page.getByLabel('Restricción alimentaria (opcional)').fill('Sin gluten')
  await page.getByRole('button', { name: '+ Añadir invitado' }).click()
  await expect(page.getByRole('cell', { name: 'Ana Lucía Vega' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sin gluten' })).toBeVisible()

  // 2. El estado se recorre con un clic: pendiente → confirmado.
  // El botón de la fila, no la chip del filtro: se distingue por su título.
  await page.getByRole('button', { name: 'Pendiente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirmado', exact: true })).toBeVisible()

  // 3. La chip VIP, que la maqueta pide y antes no tenía dato.
  await page.getByRole('button', { name: 'Marcar VIP' }).click()
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
    await page.getByLabel('Nombre de la persona').fill(nombre)
    await page.getByRole('button', { name: '+ Añadir invitado' }).click()
    await expect(page.getByRole('cell', { name: nombre })).toBeVisible()
  }

  await page.getByLabel('Nombre de la persona').fill('Cinco')
  await page.getByRole('button', { name: '+ Añadir invitado' }).click()

  // El anunciador de rutas de Next también es role=alert: el aviso del formulario es el
  // que lleva texto.
  await expect(page.getByRole('alert').filter({ hasText: 'cupos' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Cinco' })).toHaveCount(0)

  await deletePeopleEvent(slug)
})
