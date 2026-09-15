import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

/**
 * La web pública cachea sus datos entre visitas y el admin la invalida al guardar
 * (15 de septiembre de 2026). Dos cosas, las dos contra la caché real de Next:
 *
 * 1. **Cachea**: un precio cambiado **por fuera del admin** —con SQL— no se ve en la siguiente
 *    visita. Es la prueba de que la portada ya no lee Postgres en cada petición.
 * 2. **Se invalida**: retirar un modelo **desde el admin** lo quita de la colección en la
 *    siguiente carga, sin esperar a que caduque.
 */
test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await sql.end({ timeout: 5 })
})

test('un cambio por fuera del admin no se ve: la portada lee de la caché', async ({ page }) => {
  await page.goto('/es')
  await expect(page.getByText('Bs 1.190')).toBeVisible()

  const [antes] = await sql<{ price: number }[]>`select price_cents as price from plans where slug = 'firma-3d'`
  await sql`update plans set price_cents = 77700 where slug = 'firma-3d'`
  try {
    await page.goto('/es')
    await expect(page.getByText('Bs 1.190')).toBeVisible()
    await expect(page.getByText('Bs 777')).toHaveCount(0)
  } finally {
    await sql`update plans set price_cents = ${antes!.price} where slug = 'firma-3d'`
  }
})

test('retirar un modelo desde el admin lo quita de la colección en la siguiente carga', async ({ browser, page }) => {
  const tarjeta = () => page.locator('a[href="/modelos/es/boda-bot"]')
  await page.goto('/es/colecciones')
  await expect(tarjeta().first()).toBeVisible()

  const admin = await (await browser.newContext({ storageState: ADMIN_AUTH_STATE })).newPage()
  const fila = admin.getByRole('listitem').filter({ has: admin.getByRole('link', { name: 'Abrir el modelo Botánica en una pestaña nueva' }) })
  try {
    await admin.goto('/panel/admin/modelos')
    await fila.getByRole('button', { name: 'Retirar de la web' }).click()
    await expect(fila.getByText('Retirado de la web.')).toBeVisible({ timeout: 15_000 })

    await page.goto('/es/colecciones')
    await expect(tarjeta()).toHaveCount(0)
  } finally {
    await admin.goto('/panel/admin/modelos')
    await fila.getByRole('button', { name: 'Publicar en la web' }).click()
    await expect(fila.getByText('Publicado en la web.')).toBeVisible({ timeout: 15_000 })
    await admin.context().close()
  }

  await page.goto('/es/colecciones')
  await expect(tarjeta().first()).toBeVisible()
})
