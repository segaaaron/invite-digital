import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { INVITACION_MINIMA } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **La música de los diseños sin reproductor** (28 de septiembre): «Destino» no pinta
 * reproductor, así que su canción va en un botón flotante con una nota. Suena al abrir la
 * invitación y el botón la pausa y la reanuda. Con un MP3 de verdad (`ffmpeg`, que está en la
 * imagen y en el CI): sin archivo detrás no se ve si el navegador llega a reproducir.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const SLUG = 'musica-flotante-e2e'
const DIR = process.env.EVENT_MEDIA_DIR ?? '.data/eventos'
let fichero = ''

test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await deleteEvent(SLUG)
  if (fichero !== '') rmSync(fichero, { force: true })
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('en «Destino» la canción va en el botón flotante: suena al abrir y la nota la pausa', async ({ page }) => {
  const { token } = await seedInvitation({ slug: SLUG })
  const [evento] = await sql<{ id: string }[]>`update events set theme_key = 'dest' where slug = ${SLUG} returning id`
  const [media] = await sql<{ id: string }[]>`
    insert into event_media (event_id, content_type, original_name, byte_size) values (${evento!.id}, 'audio/mpeg', 'cancion.mp3', 0) returning id
  `
  mkdirSync(DIR, { recursive: true })
  fichero = join(DIR, `${media!.id}.mp3`)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=20', '-q:a', '9', fichero])
  const contenido = { ...INVITACION_MINIMA, music: { track: 'Nuestra canción', artist: 'Ana y Luis', audioMediaId: media!.id } }
  await sql`insert into event_content (event_id, blocks) values (${evento!.id}, ${sql.json(contenido)})`

  await page.goto(`/i/${token}`)
  // Con la portada puesta, el botón queda debajo: no se puede pulsar.
  const nota = page.getByRole('button', { name: /(Pausar|Reproducir) Nuestra canción · Ana y Luis/ })
  await page.getByRole('button', { name: 'Abrir la invitación' }).click()

  // Abrir la portada es el gesto: la canción arranca sola.
  await expect(nota).toHaveAccessibleName('Pausar Nuestra canción · Ana y Luis')
  // Abajo a la derecha **del teléfono**: en escritorio la invitación va dentro de su marco.
  const caja = (await nota.boundingBox())!
  const marco = (await page.locator('.invitacion-marco').boundingBox())!
  expect(caja.x + caja.width).toBeGreaterThan(marco.x + marco.width - 40)
  expect(caja.x + caja.width).toBeLessThanOrEqual(marco.x + marco.width)
  expect(caja.y + caja.height).toBeGreaterThan(marco.y + marco.height - 60)

  // Sigue a la vista al bajar por la invitación.
  await page.mouse.wheel(0, 2500)
  await expect(nota).toBeInViewport()

  await nota.click()
  await expect(nota).toHaveAccessibleName('Reproducir Nuestra canción · Ana y Luis')
  expect(await page.locator('audio').evaluate((a: HTMLAudioElement) => a.paused)).toBe(true)

  await nota.click()
  await expect(nota).toHaveAccessibleName('Pausar Nuestra canción · Ana y Luis')
  expect(await page.locator('audio').evaluate((a: HTMLAudioElement) => a.paused)).toBe(false)
})

test('en el celular va abajo a la derecha de la pantalla', async ({ browser }) => {
  const [media] = await sql<{ id: string }[]>`select m.id from event_media m join events e on e.id = m.event_id where e.slug = ${SLUG}`
  test.skip(media === undefined, 'depende de la prueba anterior')
  const contexto = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await contexto.newPage()
  const [grupo] = await sql<{ id: string }[]>`select g.id from guest_groups g join events e on e.id = g.event_id where e.slug = ${SLUG}`
  const { createHash, randomBytes } = await import('node:crypto')
  const token = randomBytes(16).toString('base64url')
  await sql`update guest_groups set token_hash = ${createHash('sha256').update(token).digest()} where id = ${grupo!.id}`

  await page.goto(`/i/${token}`)
  await page.getByRole('button', { name: 'Abrir la invitación' }).click()
  const nota = page.getByRole('button', { name: /(Pausar|Reproducir) Nuestra canción · Ana y Luis/ })
  await expect(nota).toBeVisible()
  const caja = (await nota.boundingBox())!
  expect(caja.x + caja.width).toBeGreaterThan(390 - 40)
  expect(caja.y + caja.height).toBeGreaterThan(844 - 60)
  await page.screenshot({ path: 'test-results/musica-flotante-celular.png' })
  await contexto.close()
})
