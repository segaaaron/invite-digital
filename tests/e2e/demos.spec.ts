import { expect, test, type Page } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

/**
 * **Las demos de un día** (0099): la invitación de muestra que el admin arma para un posible cliente, se la
 * manda por WhatsApp y muere en 24 horas.
 *
 * Lo que se prueba aquí es lo que no se ve en una unitaria: que la pantalla la crea de verdad, que el
 * enlace abre como una invitación cualquiera con la cinta de la casa, que **no se cuela en la cartera de
 * eventos**, y que pasada su hora deja de abrir con la pantalla de venta en vez de un 404.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite')

test.use({ storageState: ADMIN_AUTH_STATE })

test.afterAll(async () => {
  await sql`delete from events where demo_until is not null and title like 'Demo e2e%'`
  await sql.end()
})

/** Arma una demo desde la pantalla del admin, como lo haría él, y devuelve el enlace que le sale. */
async function armarDemo(page: Page, titulo: string): Promise<string> {
  await page.goto('/panel/admin/demos')
  await page.getByRole('link', { name: /nueva demo/i }).first().click()
  // El enlace sale dos veces en cuanto se crea —en el panel y ya en su fila—, así que se acota al panel.
  const panel = page.getByRole('dialog', { name: 'Nueva demo' })
  await panel.getByLabel('Nombre de la fiesta').fill(titulo)
  await panel.getByLabel('A nombre de').fill('Familia Rojas')
  await panel.getByRole('button', { name: /crear la demo/i }).click()
  await expect(panel.getByText(/caduca en 24 horas/i)).toBeVisible()
  return panel.getByLabel('Enlace de la demo').inputValue()
}

test('el admin arma una demo y su enlace abre como una invitación, con la cinta de la casa', async ({ page }) => {
  const enlace = await armarDemo(page, 'Demo e2e Valentina')
  expect(enlace).toContain('/i/')

  // Las dos formas de mandarla que pidió el usuario: WhatsApp y correo.
  const panel = page.getByRole('dialog', { name: 'Nueva demo' })
  await expect(panel.getByRole('link', { name: /mandar por whatsapp/i })).toHaveAttribute('href', /^https:\/\/wa\.me\//)
  await expect(panel.getByRole('link', { name: /mandar por correo/i })).toHaveAttribute('href', /^mailto:/)

  await page.goto(enlace)
  await expect(page.getByText(/demostración de/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /quiero la mía/i })).toBeVisible()
})

test('se edita como una invitación de verdad: textos, fotos y música, sin plan que la corte', async ({ page }) => {
  // Lo que el usuario pidió y no tenía (20 oct): «Editarla» llevaba a la ficha administrativa del evento,
  // donde no hay ni música ni textos, y la demo nacía sin plan, así que media pantalla salía con «tu plan
  // no la incluye». Una demo enseña lo que vendemos: va con el plan más completo.
  await armarDemo(page, 'Demo e2e editable')
  await page.getByRole('dialog', { name: 'Nueva demo' }).getByRole('link', { name: /editarla/i }).click()

  await expect(page.getByRole('heading', { name: 'Escribir la invitación' })).toBeVisible()
  await expect(page.getByText(/tu plan no la incluye/i)).toHaveCount(0)
  // La canción vive en el bloque de música del editor de contenido.
  await expect(page.getByText(/m[úu]sica|canci[óo]n/i).first()).toBeVisible()
})

test('la vista previa del panel enseña la misma cinta que verá el cliente', async ({ page }) => {
  // El admin no tenía por qué abrir el enlace para ver la marca de agua: antes la cinta solo salía en la
  // invitación de verdad, y desde el panel parecía que no existía.
  await armarDemo(page, 'Demo e2e cinta')
  await page.goto('/panel/admin/demos')
  await page.getByRole('link', { name: /verla/i }).first().click()

  await expect(page.getByText(/demostraci[óo]n de/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /quiero la m/i })).toBeVisible()
})

test('no se cuela en la cartera de eventos, y sí sale en Demos', async ({ page }) => {
  await armarDemo(page, 'Demo e2e cartera')

  await page.goto('/panel/admin/eventos')
  await expect(page.getByText('Demo e2e cartera')).toHaveCount(0)

  await page.goto('/panel/admin/demos')
  // Exacto: el texto también aparece dentro del diálogo de borrar, que vive oculto en la misma fila.
  await expect(page.getByText('Demo e2e cartera', { exact: true }).first()).toBeVisible()
})

test('pasada su hora no abre: se le ofrece la suya en vez de un 404', async ({ page }) => {
  const enlace = await armarDemo(page, 'Demo e2e vencida')
  // El reloj no se puede adelantar un día en una e2e: se le mueve la hora de muerte, que es lo mismo.
  await sql`update events set demo_until = now() - interval '1 hour' where title = 'Demo e2e vencida'`

  await page.goto(enlace)
  await expect(page.getByRole('heading', { name: /ya caducó/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /planes y precios/i })).toBeVisible()
})
