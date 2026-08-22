import { expect, test } from '@playwright/test'
import QRCode from 'qrcode'
import { AUTH_STATE } from './fixtures/atelier'
import { closeCheckinDb, deleteEvent, liveArrivals, seedDoorEvent } from './fixtures/checkin'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-puerta-e2e'

test.afterAll(async () => {
  await deleteEvent(SLUG)
  await closeCheckinDb()
})

test('el lector por teclado registra la llegada sin cámara', async ({ page }) => {
  const { token, groupId } = await seedDoorEvent(SLUG)

  await page.goto(`/panel/eventos/${SLUG}/puerta`)
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('0')

  // Un lector por USB se comporta como un teclado: teclea el código y remata con Enter.
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/Bienvenidos/i)).toBeVisible()
  await expect(page.getByText('Familia Rojas Peña')).toBeVisible()
  // La cantidad la fijó el servidor con lo que el grupo había confirmado.
  await expect(page.getByLabel('Personas que entraron')).toHaveText('3')
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('1')

  // Y está en la base, no solo en la pantalla.
  expect(await liveArrivals(groupId)).toEqual([{ arrivedCount: 3 }])
})

test('un pase escaneado con la cámara registra la llegada del grupo', async ({ page, context }) => {
  await context.grantPermissions(['camera'])
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

  await page.goto(`/panel/eventos/${SLUG}/puerta`)

  await expect(page.getByText(/Bienvenidos/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('1')
  expect(await liveArrivals(groupId)).toEqual([{ arrivedCount: 3 }])
})

test('el pase de otra boda no abre esta puerta', async ({ page }) => {
  await seedDoorEvent(SLUG)
  const ajeno = await seedDoorEvent('boda-ajena-e2e')

  await page.goto(`/panel/eventos/${SLUG}/puerta`)
  await page.keyboard.type(ajeno.token)
  await page.keyboard.press('Enter')

  await expect(page.getByText(/no es de tu evento/i)).toBeVisible()
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('0')
  expect(await liveArrivals(ajeno.groupId)).toEqual([])

  await deleteEvent('boda-ajena-e2e')
})
