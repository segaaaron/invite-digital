import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeRegistryDb, deleteRegistryEvent, giftStateOf, revokeToken, seedRegistryEvent } from './fixtures/regalos'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-regalos-e2e'

test.afterAll(async () => {
  await deleteRegistryEvent(SLUG)
  await closeRegistryDb()
})

test('el invitado reserva un regalo desde su enlace y el panel lo ve reservado', async ({ page }) => {
  const { eventId, token, otroToken } = await seedRegistryEvent(SLUG)

  // 1. El atelier carga un regalo y abre un fondo. Las altas viven tras los botones de
  // la cabecera, como en la maqueta; se abren por la barra de direcciones.
  await page.goto(`/panel/eventos/${SLUG}/regalos?panel=regalo`)

  await page.getByLabel('Regalo').fill('Cafetera italiana')
  await page.getByLabel('Precio').fill('450,50')
  await page.getByLabel('Tienda', { exact: true }).fill('Casa Ideal')
  await page.getByRole('button', { name: 'Añadir regalo' }).click()
  await page.getByRole('link', { name: 'Lista de regalos' }).click()
  await expect(page.getByRole('heading', { name: 'Cafetera italiana' })).toBeVisible()

  // El importe llegó a la base como centavos exactos, sin perder el céntimo por el
  // camino: 450,50 son 45050, no 45049,999…
  // La cabecera también cuenta el dinero de la mesa, así que el importe aparece dos
  // veces: se comprueba el de la tarjeta del regalo.
  await expect(page.getByText('Bs 450,50').first()).toBeVisible()

  await page.goto(`/panel/eventos/${SLUG}/regalos?panel=fondo`)
  await page.getByLabel('Fondo').fill('Luna de miel')
  await page.getByLabel('Meta').fill('5.000,00')
  await page.getByRole('button', { name: 'Abrir fondo' }).click()
  await expect(page.getByRole('heading', { name: 'Luna de miel' })).toBeVisible()

  // 2. El invitado abre su enlace y reserva.
  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { name: 'Mesa de regalos' })).toBeVisible()
  await expect(page.getByText('Cafetera italiana')).toBeVisible()
  await expect(page.getByText('Luna de miel')).toBeVisible()

  await page.getByRole('button', { name: 'Reservar' }).click()
  await expect(page.getByText('Lo reservaste tú')).toBeVisible()

  // Y está en la base, no solo en la pantalla.
  expect(await giftStateOf(eventId, 'Cafetera italiana')).toEqual({
    status: 'reserved',
    claimedBy: 'Familia Rojas Peña',
  })

  // 3. Otro invitado lo ve reservado y sin botón, y sin saber quién lo reservó.
  await page.goto(`/i/${otroToken}`)
  await expect(page.getByText('Ya lo reservó otro invitado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reservar' })).toBeHidden()
  await expect(page.getByText('Familia Rojas Peña')).toBeHidden()

  // 4. El panel lo ve reservado, con el nombre del grupo.
  await page.goto(`/panel/eventos/${SLUG}/regalos`)
  await page.getByRole('link', { name: 'Lista de regalos' }).click()
  await expect(page.getByText('Reservado', { exact: true })).toBeVisible()
  await expect(page.getByText('Reservado por Familia Rojas Peña')).toBeVisible()

  // 5. El invitado lo suelta y vuelve a estar disponible.
  await page.goto(`/i/${token}`)
  await page.getByRole('button', { name: 'Soltar mi reserva' }).click()
  await expect(page.getByRole('button', { name: 'Reservar' })).toBeVisible()

  expect(await giftStateOf(eventId, 'Cafetera italiana')).toEqual({ status: 'available', claimedBy: null })
})

test('un enlace revocado no reserva nada: la página ni siquiera existe', async ({ page }) => {
  const slug = `${SLUG}-revocado`
  const { token } = await seedRegistryEvent(slug)

  await page.goto(`/panel/eventos/${slug}/regalos?panel=regalo`)
  await page.getByLabel('Regalo').fill('Batidora')
  await page.getByLabel('Precio').fill('300')
  await page.getByRole('button', { name: 'Añadir regalo' }).click()
  await expect(page.getByRole('heading', { name: 'Batidora' })).toBeVisible()

  // El enlace todavía vale: el bloque de regalos se ve.
  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { name: 'Mesa de regalos' })).toBeVisible()

  await revokeToken(token)

  // Revocado: 404, nunca 403. Un 403 confirmaría que el token existe, que es justo lo
  // que se le regala a quien está probando tokens. Y sin página no hay nada que reservar.
  const respuesta = await page.goto(`/i/${token}`)
  expect(respuesta?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Mesa de regalos' })).toBeHidden()

  await deleteRegistryEvent(slug)
})
