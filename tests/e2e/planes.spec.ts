import { expect, test, type Page } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closePlanesDb, deletePlanEvent, guestGroupCount, seedPlanEvent } from './fixtures/planes'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-planes-e2e'

test.afterAll(async () => {
  await deletePlanEvent(SLUG)
  await closePlanesDb()
})

/** Da de alta un grupo por el diálogo de la maqueta: primer invitado y sus acompañantes. */
async function crearGrupo(page: Page, etiqueta: string, acompanantes = 1): Promise<void> {
  await page.getByLabel('Nombre completo').fill(etiqueta)
  await page.getByLabel('Grupo', { exact: true }).selectOption('')
  await page.getByLabel('Nombre del grupo nuevo').fill(etiqueta)
  await page.getByLabel('Acompañantes').fill(String(acompanantes))
  await page.getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.waitForURL(/invitados$/)
}

test('el límite del plan corta en el servidor, no solo en el botón', async ({ page }) => {
  // Plan de prueba con dos grupos de cupo. No se le baja el límite a `atelier`: quedaría
  // bajado para el resto de la suite y para la base de desarrollo.
  const { eventId } = await seedPlanEvent(SLUG, 2)

  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)

  // 1. Los dos que caben entran.
  await crearGrupo(page, 'Familia Rojas')
  await expect(page.getByRole('cell', { name: 'Familia Rojas' }).first()).toBeVisible()

  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)
  await crearGrupo(page, 'Familia Vargas')
  await expect(page.getByRole('cell', { name: 'Familia Vargas' }).first()).toBeVisible()

  expect(await guestGroupCount(eventId)).toBe(2)

  // 2. En el tope, el aviso cambia de tono y el botón de guardar queda deshabilitado.
  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)
  await page.getByLabel('Grupo', { exact: true }).selectOption('')
  await expect(page.getByText('El plan no admite más grupos')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled()

  // 3. Y ahora lo que importa: se desactiva el guardia del navegador y se manda el
  //    formulario igual. Es lo que haría cualquiera con las herramientas de desarrollo
  //    abiertas, o llamando a la acción a mano: una Server Action es un extremo HTTP
  //    público y el botón deshabilitado no protege nada. El corte tiene que venir del
  //    servidor.
  await page.getByLabel('Nombre completo').fill('Familia Colada')
  await page.getByLabel('Nombre del grupo nuevo').fill('Familia Colada')
  await page.evaluate(() => {
    document.querySelectorAll('button[type="submit"]').forEach((b) => b.removeAttribute('disabled'))
  })
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText('El plan no admite más grupos')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Familia Colada' })).toBeHidden()

  // La base es el testigo, no la pantalla: siguen siendo dos.
  expect(await guestGroupCount(eventId)).toBe(2)
})

test('la mesa de regalos no incluida en el plan queda cerrada, con el plan que sí la trae', async ({ page }) => {
  await seedPlanEvent(SLUG, 5)

  await page.goto(`/panel/eventos/${SLUG}/regalos`)

  await expect(page.getByRole('heading', { name: 'Regalos' })).toBeVisible()
  await expect(page.getByText(/no incluye la mesa de regalos/i)).toBeVisible()
  // No basta con cerrar: hay que decir por dónde se pasa.
  await expect(page.getByRole('link', { name: 'Ver planes' })).toBeVisible()
  // Y no se cuela ni el formulario de la sección cerrada.
  await expect(page.getByLabel('Regalo')).toBeHidden()
})

test('el atelier solicita un cambio de plan y lo aplica', async ({ page }) => {
  await seedPlanEvent(SLUG, 2)

  await page.goto(`/panel/eventos/${SLUG}/plan`)

  await page.getByLabel('Plan que se quiere').selectOption({ label: 'alta-costura' })
  await page.getByLabel('Nota para el atelier').fill('La lista creció.')
  await page.getByRole('button', { name: 'Solicitar cambio' }).click()

  await expect(page.getByLabel('Solicitud pendiente')).toContainText('alta-costura')
  // Una sola pendiente por evento: con la solicitud viva ya no hay formulario que
  // permita mandar otra.
  await expect(page.getByRole('button', { name: 'Solicitar cambio' })).toBeHidden()

  await page.getByRole('button', { name: 'Aplicar el cambio' }).click()

  // El plan del evento cambió de verdad: el más caro no limita los grupos, así que el
  // aviso de tope desaparece de la página del evento.
  await expect(page.getByLabel('Plan alta-costura')).toContainText('Plan actual')

  // El alta vive en la vista de invitados, que es propia como en la maqueta.
  await page.goto(`/panel/eventos/${SLUG}/invitados?panel=alta`)
  await page.getByLabel('Grupo', { exact: true }).selectOption('')
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled()
})
