import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'
import { abrirSeccion } from './helpers/panel'

/**
 * **Subir fotos y canción como desde un celular** (29 de septiembre, en producción): una foto de 24 MB o una
 * canción de más de 10 MB superaban el tope del proxy de Next, la acción reventaba («Unexpected end of form»)
 * y el panel entero decía «This page couldn't load». Además, la foto subida no llegaba a la invitación sin
 * pulsar «Guardar». Ahora la foto se reduce en el navegador, se guarda sola y la invitación la usa.
 */
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const SLUG = 'fotos-grandes-e2e'
const DIR = mkdtempSync(join(tmpdir(), 'fotos-e2e-'))
const FOTO = join(DIR, 'celular.jpg')
const CANCION = join(DIR, 'cancion.wav')

test.use({ storageState: AUTH_STATE })
test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test.beforeAll(async () => {
  // Ruido: no se comprime, así que pesa como una foto de verdad (~24 MB) y una canción de ~12 MB.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'nullsrc=s=6000x4500,geq=random(1)*255:random(2)*255:128', '-frames:v', '1', '-q:v', '1', FOTO])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anoisesrc=d=70:a=0.1', '-ac', '2', '-ar', '44100', CANCION])
  await sql`delete from service_failures where created_at > now() - interval '1 hour'`
  await seedInvitation({ slug: SLUG, plan: 'alta-costura' })
  await sql`update events set theme_key = 'xv-valeria' where slug = ${SLUG}`
  await escribirInvitacion(SLUG)
})

test.afterAll(async () => {
  rmSync(DIR, { recursive: true, force: true })
  await deleteEvent(SLUG)
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

const bloque = async (seccion: string) =>
  (await sql<{ b: Record<string, string> | null }[]>`select blocks->${seccion} as b from event_content c join events e on e.id = c.event_id where e.slug = ${SLUG}`)[0]?.b ?? null

test('una foto de 24 MB en la portada se reduce, se sube, se guarda sola y la invitación la usa', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/configuracion`)
  const portada = await abrirSeccion(page, 'Portada y nombres')
  await portada.getByRole('button', { name: 'Subir una fotografía' }).click()
  const dialogo = page.locator('dialog[open]')
  await dialogo.getByLabel('Elegir fotografía').setInputFiles(FOTO)
  await dialogo.getByRole('button', { name: 'Subir', exact: true }).click()

  await expect(dialogo).toHaveCount(0, { timeout: 60_000 })
  // Sin pulsar «Guardar»: la sección se guarda sola con la foto.
  await expect(portada.getByText('Guardado.')).toBeVisible({ timeout: 20_000 })
  await expect.poll(async () => (await bloque('hero'))?.coverImageId ?? null).not.toBeNull()
  const [foto] = await sql<{ bytes: number }[]>`select m.byte_size as bytes from event_media m join events e on e.id = m.event_id where e.slug = ${SLUG} and m.content_type like 'image/%'`
  expect(foto!.bytes).toBeLessThan(3_000_000)
  // La invitación de la vista previa ya la pinta.
  await expect(page.locator('section[aria-label="Vista previa de la invitación"] img[src*="/media/"]').first()).toBeAttached()
})

test('una canción de más de 10 MB sube sin tumbar la página', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/configuracion`)
  const cancion = await abrirSeccion(page, 'Canción')
  await cancion.getByRole('button', { name: 'Subir la canción' }).click()
  const dialogo = page.locator('dialog[open]')
  await dialogo.getByLabel('Elegir canción').setInputFiles(CANCION)
  await dialogo.getByRole('button', { name: 'Subir', exact: true }).click()
  await expect(dialogo).toHaveCount(0, { timeout: 60_000 })
  await expect.poll(async () => (await bloque('music'))?.audioMediaId ?? null, { timeout: 20_000 }).not.toBeNull()
  await expect(page.getByRole('heading', { name: 'Personalizar invitación' }).or(page.getByRole('heading', { name: 'Configuración del evento' }))).toBeVisible()
  expect((await sql<{ n: number }[]>`select count(*)::int as n from service_failures where created_at > now() - interval '5 minutes'`)[0]!.n).toBe(0)
})

test('si el servidor falla al guardar, el aviso sale en la tarjeta y la página sigue entera', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/configuracion`)
  const portada = await abrirSeccion(page, 'Portada y nombres')
  // El servidor responde 500 a la acción de guardar, como cuando algo se rompe de verdad.
  await page.route(`**/panel/eventos/${SLUG}/configuracion`, (ruta) => (ruta.request().method() === 'POST' ? ruta.fulfill({ status: 500, body: 'fallo' }) : ruta.continue()))
  await portada.getByRole('button', { name: 'Guardar' }).click()
  await expect(portada.getByRole('alert')).toContainText('No se pudo guardar: se cortó la conexión o el servidor no respondió')
  await expect(page.getByText("This page couldn't load")).toHaveCount(0)
  await expect(page.getByText('Algo no salió bien')).toHaveCount(0)
  // Se puede seguir: la barra y las demás secciones siguen ahí, y al volver el servidor, guarda.
  await expect(page.getByRole('navigation').first()).toBeVisible()
  await page.unroute(`**/panel/eventos/${SLUG}/configuracion`)
  await portada.getByRole('button', { name: 'Guardar' }).click()
  await expect(portada.getByText('Guardado.')).toBeVisible()
})
