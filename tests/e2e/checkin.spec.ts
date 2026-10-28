import { expect, test } from '@playwright/test'
import QRCode from 'qrcode'
import { AUTH_STATE } from './fixtures/atelier'
import { closeCheckinDb, deleteEvent, liveArrivals, revokeGroup, seedDoorEvent } from './fixtures/checkin'

test.use({ storageState: AUTH_STATE })

/**
 * **Un slug por prueba, no uno compartido.**
 *
 * Con uno solo, cada prueba borraba y volvía a crear el evento con el mismo slug —otro id, otro grupo,
 * otro token— y visitaba la misma dirección del modo puerta. Esa pantalla la guarda el service worker
 * para funcionar sin red, que es justo lo que se le pide, así que una prueba podía recibir la pantalla
 * guardada de la anterior: el manifiesto de un evento que ya no existe, y el pase recién sembrado
 * leyéndose como «este código no es de tu evento». Pasaba sola y fallaba en la pasada entera.
 *
 * En producción el slug no se recicla, así que el caché es correcto; el que mentía era el reciclaje.
 */
const creados: string[] = []
const nuevoSlug = () => {
  const slug = `boda-puerta-e2e-${creados.length + 1}`
  creados.push(slug)
  return slug
}

test.afterAll(async () => {
  for (const slug of creados) await deleteEvent(slug)
  await closeCheckinDb()
})

test('el lector por teclado registra la llegada sin cámara', async ({ page }) => {
  const SLUG = nuevoSlug()
  const { token, groupId } = await seedDoorEvent(SLUG)

  await page.goto(`/dashboard/events/${SLUG}/door`)
  await expect(page.getByLabel('Invitaciones que han llegado')).toHaveText('0')

  // Un lector por USB se comporta como un teclado: teclea el código y remata con Enter.
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/Bienvenidos/i)).toBeVisible()
  await expect(page.getByText('Familia Rojas Peña')).toBeVisible()
  // La cantidad la fijó el servidor con lo que el grupo había confirmado.
  await expect(page.getByLabel('Personas que entraron')).toHaveText('3')
  await expect(page.getByLabel('Invitaciones que han llegado')).toHaveText('1')

  // Y está en la base, no solo en la pantalla. Se espera a que la bandeja de salida se
  // vacíe: desde que la puerta responde en local, la escritura va por detrás.
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/^0/)
  expect(await liveArrivals(groupId)).toEqual([{ arrivedCount: 3 }])
})

test('un pase escaneado con la cámara registra la llegada del grupo', async ({ page, context }) => {
  await context.grantPermissions(['camera'])
  const SLUG = nuevoSlug()
  const { token, groupId } = await seedDoorEvent(SLUG)

  const url = `http://localhost:${process.env.E2E_PORT ?? '3100'}/i/${token}`
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const matrix = { size: modules.size, data: Array.from(modules.data) }

  // La cámara se sustituye por un MediaStream de canvas con el QR dibujado: es la
  // técnica con la que ya se validó la maqueta de punta a punta.
  await page.addInitScript((qr: { size: number; data: number[] }) => {
    const CELL = 8
    const QUIET = 4
    const side = (qr.size + QUIET * 2) * CELL
    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, side, side)
      ctx.fillStyle = 'black'
      for (let y = 0; y < qr.size; y += 1) {
        for (let x = 0; x < qr.size; x += 1) {
          if (qr.data[y * qr.size + x]) ctx.fillRect((x + QUIET) * CELL, (y + QUIET) * CELL, CELL, CELL)
        }
      }
    }
    draw()
    // El stream de un canvas quieto emite un solo fotograma: se repinta para que el
    // bucle de escaneo tenga siempre algo que leer.
    setInterval(draw, 100)
    const stream = canvas.captureStream(30)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    })
  }, matrix)

  await page.goto(`/dashboard/events/${SLUG}/door`)

  await expect(page.getByText(/Bienvenidos/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Invitaciones que han llegado')).toHaveText('1')
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/^0/)
  expect(await liveArrivals(groupId)).toEqual([{ arrivedCount: 3 }])
})

test('el pase de otra boda no abre esta puerta', async ({ page }) => {
  const SLUG = nuevoSlug()
  await seedDoorEvent(SLUG)
  const ajeno = await seedDoorEvent('boda-ajena-e2e')

  await page.goto(`/dashboard/events/${SLUG}/door`)
  await expect(page.getByLabel('Invitaciones que han llegado')).toBeVisible()
  await page.keyboard.type(ajeno.token)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/no es de tu evento/i)).toBeVisible()
  await expect(page.getByLabel('Invitaciones que han llegado')).toHaveText('0')
  expect(await liveArrivals(ajeno.groupId)).toEqual([])

  await deleteEvent('boda-ajena-e2e')
})

test('el pase de una invitación revocada no entra, y no se registra nada', async ({ page }) => {
  // Revocar solo sirve si la puerta lo mira: antes el revocado recibía tarjeta verde con su
  // mesa y contaba como llegado (F5 del escaneo del 19 oct).
  const SLUG = nuevoSlug()
  const { token, groupId } = await seedDoorEvent(SLUG)
  await revokeGroup(groupId)

  await page.goto(`/dashboard/events/${SLUG}/door`)
  // **Esperar a que la puerta esté escuchando antes de teclear.** Un lector por USB teclea de golpe, y
  // si la pantalla aún no está montada se pierden caracteres: el pase llega partido y se lee como de
  // otro evento. Es lo que hacía fallar esta prueba solo dentro de la pasada entera. La primera prueba
  // del fichero nunca lo sufrió porque mira la cifra antes de teclear, que es justo esta espera.
  await expect(page.getByLabel('Invitaciones que han llegado')).toBeVisible()
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/invitación anulada/i)).toBeVisible()
  await expect(page.getByLabel('Invitaciones que han llegado')).toHaveText('0')
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/^0/)
  expect(await liveArrivals(groupId)).toEqual([])
})

test('sin red la puerta sigue registrando, y sube al volver', async ({ page, context }) => {
  const SLUG = nuevoSlug()
  const { token, groupId } = await seedDoorEvent(SLUG)

  await page.goto(`/dashboard/events/${SLUG}/door`)
  await expect(page.getByLabel('Escaneos por subir')).toHaveText('0')

  await context.setOffline(true)
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')

  // La bienvenida sale igual: la decide el dispositivo, no la red.
  await expect(page.getByText(/Bienvenidos/i)).toBeVisible()
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/1/)
  expect(await liveArrivals(groupId)).toEqual([])

  await context.setOffline(false)
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/^0/, { timeout: 40_000 })

  // Y la llegada está de verdad en la base, no solo en la pantalla.
  expect(await liveArrivals(groupId)).toEqual([{ arrivedCount: 3 }])
  await page.goto(`/dashboard/events/${SLUG}/door`)
  await expect(page.getByLabel('Invitaciones que han llegado')).toHaveText('1')
})
