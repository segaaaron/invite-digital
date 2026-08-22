import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closeAnalyticsDb, deleteAnalyticsEvent, seedAnalyticsEvent, viewsOf } from './fixtures/analitica'

const SLUG = 'boda-analitica-e2e'

test.afterAll(async () => {
  await deleteAnalyticsEvent(SLUG)
  await closeAnalyticsDb()
})

test('abrir la invitación cuenta una visita, con su dispositivo y su camino', async ({ browser }) => {
  const { eventId, token } = await seedAnalyticsEvent(SLUG)

  // 1. El invitado abre desde un iPhone y llegando por WhatsApp.
  const movil = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { referer: 'https://web.whatsapp.com/' },
  })
  const invitado = await movil.newPage()
  await invitado.goto(`/i/${token}`)
  await expect(invitado.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(async () => (await viewsOf(eventId)).length).toBe(1)

  const [primera] = await viewsOf(eventId)
  expect(primera?.device).toBe('mobile')
  expect(primera?.source).toBe('whatsapp')

  // 2. Recargar en la misma pestaña NO suma otra: el guardo vive en sessionStorage.
  await invitado.goto(`/i/${token}`)
  await invitado.waitForTimeout(800)
  expect(await viewsOf(eventId)).toHaveLength(1)

  // 3. El panel lo enseña con su desglose.
  const atelier = await browser.newContext({ storageState: AUTH_STATE })
  const panel = await atelier.newPage()
  await panel.goto(`/panel/eventos/${SLUG}/estadisticas`)
  await expect(panel.getByText('Móvil')).toBeVisible()
  await expect(panel.getByText('WhatsApp')).toBeVisible()

  await panel.goto(`/panel/eventos/${SLUG}`)
  await expect(panel.getByText('Visitas a la invitación')).toBeVisible()
})

test('un token desconocido no escribe ninguna visita', async ({ browser }) => {
  const { eventId } = await seedAnalyticsEvent(`${SLUG}-falso`)

  const contexto = await browser.newContext()
  const pagina = await contexto.newPage()
  const respuesta = await pagina.goto('/i/tokenquenoexisteaqui00')
  expect(respuesta?.status()).toBe(404)

  expect(await viewsOf(eventId)).toHaveLength(0)
  await deleteAnalyticsEvent(`${SLUG}-falso`)
})
