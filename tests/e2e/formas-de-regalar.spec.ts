import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import sharp from 'sharp'
import { AUTH_STATE } from './fixtures/atelier'
import { createHash, randomBytes } from 'node:crypto'

test.use({ storageState: AUTH_STATE })

const SLUG = 'boda-formas-e2e'
// **Su propia conexión**, sin la fixture de regalos: cerrarla en este `afterAll` dejaba a
// `regalos.spec` escribiendo contra una conexión muerta (`write CONNECTION_ENDED`).
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

const borrar = () => sql`delete from events where slug = ${SLUG}`

/** Un evento del plan que lo trae todo, del atelier de las e2e, con una invitación. Devuelve su enlace. */
async function sembrar(): Promise<{ token: string }> {
  await borrar()
  const [evento] = await sql<{ id: string }[]>`
    insert into events (user_id, slug, title, event_date, rsvp_deadline, locale, theme_key, status, plan_id)
    values ((select id from users where email = 'atelier@invitepremium.bo'), ${SLUG}, 'Boda formas e2e', '2027-05-15', '2027-05-01', 'es', 'clasico', 'live',
            (select id from plans where slug = 'alta-costura'))
    returning id
  `
  const token = randomBytes(16).toString('base64url')
  await sql`insert into guest_groups (event_id, label, seats, token_hash) values (${evento!.id}, 'Familia Rojas', 2, ${createHash('sha256').update(token).digest()})`
  return { token }
}

test.afterAll(async () => {
  await borrar()
  await sql.end({ timeout: 5 })
})

test('sobres y transferencia con QR: se guardan en el panel y el invitado los ve y descarga el QR', async ({ page, request }) => {
  const { token } = await sembrar()
  const qrPng = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#000000' } }).png().toBuffer()

  // 1. Sin nada encendido, el panel lo dice: la invitación no enseña la sección.
  await page.goto(`/panel/eventos/${SLUG}/regalos`)
  await expect(page.getByText('Tu invitación no muestra regalos todavía')).toBeVisible()

  // 2. Una transferencia sin cuenta ni QR no se guarda: el invitado no tendría cómo pagar.
  await page.getByRole('switch', { name: /Recibir por transferencia/ }).check()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('carga los datos de tu cuenta o sube el QR')).toBeVisible()

  // 3. Sobres con su frase, la cuenta y el QR del banco.
  await page.getByRole('switch', { name: /Pedir lluvia de sobres/ }).check()
  await page.getByLabel('La frase (opcional)').fill('Tu presencia es lo más importante; si quieres, trae tu sobre.')
  await page.getByRole('switch', { name: /Recibir por transferencia/ }).check()
  await page.getByLabel('Banco').fill('Banco Nacional de Bolivia')
  await page.getByLabel('Titular').fill('Ana Vega Rojas')
  await page.getByLabel('Número de cuenta').fill('1000-2000-3000')
  await page.getByLabel(/Subir el QR/).setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: qrPng })
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Guardado. Ya lo ven tus invitados')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Tu invitación muestra: lluvia de sobres, transferencia.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Tu QR para recibir transferencias' })).toBeVisible()

  // 4. El invitado lo ve en su invitación, con la cuenta para copiar y el QR para descargar.
  await page.goto(`/i/${token}`)
  await expect(page.getByRole('heading', { name: 'Lluvia de sobres' })).toBeVisible()
  await expect(page.getByText('si quieres, trae tu sobre')).toBeVisible()
  await expect(page.getByText('1000-2000-3000')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copiar' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Código QR para transferir' })).toBeVisible()
  const descarga = page.getByRole('link', { name: 'Descargar QR' })
  const qr = await request.get(String(await descarga.getAttribute('href')))
  expect(qr.status()).toBe(200)
  expect(qr.headers()['content-type']).toBe('image/png')
  expect(qr.headers()['cache-control']).toContain('private')

  // 5. Un enlace que no es de una invitación no llega al QR.
  expect((await request.get('/i/no-existe-este-enlace/regalos-qr')).status()).toBe(404)
})

test('en un XV con tarjeta de regalos propia va el QR real, no el de adorno de la maqueta', async ({ page }) => {
  const { token } = await sembrar()
  await sql`update events set theme_key = 'xv-luciana' where slug = ${SLUG}`
  const eventId = (await sql<{ id: string }[]>`select id from events where slug = ${SLUG}`)[0]!.id
  const qrPng = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#000000' } }).png().toBuffer()
  await sql`
    insert into event_gift_ways (event_id, sobres, transferencia, qr_imagen, qr_tipo)
    values (${eventId}, true, true, ${qrPng}, 'image/png')
    on conflict (event_id) do update set sobres = true, transferencia = true, qr_imagen = excluded.qr_imagen, qr_tipo = 'image/png'
  `

  await page.goto(`/i/${token}`)
  await expect(page.getByRole('img', { name: 'Código QR para transferir' })).toBeAttached()
  await expect(page.getByText('Escanea Aquí')).toHaveCount(0)

  // Sin transferencia ni lista ni sobres, la tarjeta entera desaparece: ni QR falso ni hueco.
  await sql`update event_gift_ways set sobres = false, transferencia = false where event_id = ${eventId}`
  await page.goto(`/i/${token}`)
  await expect(page.getByRole('img', { name: 'Código QR para transferir' })).toHaveCount(0)
  await expect(page.getByText('Escanea Aquí')).toHaveCount(0)
})
