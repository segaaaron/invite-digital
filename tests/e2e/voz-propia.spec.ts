import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **El dictado propio de Luxury** con voz de verdad (8 de octubre): en Chrome de iPhone Apple no deja su dictado,
 * pero sí grabar. Aquí Chrome se presenta como Chrome de iPhone y su micrófono «oye» un audio en español (proyecto
 * `voz-propia` en `playwright.config.ts`); Vosk lo entiende en el navegador —con la CSP de producción— y Luxury
 * contesta. Nada de dictado simulado: el modelo, el motor y el micrófono son los de verdad.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const SLUG = 'voz-propia-e2e'

test.use({
  storageState: AUTH_STATE,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

test.beforeAll(async () => {
  await seedInvitation({ slug: SLUG, plan: 'imperial' })
  await escribirInvitacion(SLUG)
})

test.afterAll(async () => {
  await deleteEvent(SLUG)
  await closeInvitationDb()
})

test('en Chrome de iPhone, Luxury oye lo dicho con su propio dictado y responde', async ({ page }) => {
  test.setTimeout(90_000)
  // La voz de la respuesta se apunta (el navegador de pruebas no tiene altavoz).
  await page.addInitScript(() => {
    const w = window as unknown as { __leido: string[] }
    w.__leido = []
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      if (u.text !== '') w.__leido.push(u.text)
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 20)
    }
  })
  const fallos: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') fallos.push(m.text())
  })
  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  // Como en la segunda visita: con el Service Worker ya al mando (en la primera se instala después de cargar).
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
  const panel = page.locator('dialog[open]')
  await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
  await expect(panel.getByText('Conversación por voz · di «listo» para terminar')).toBeVisible()

  // Lo que oyó, ya como mensaje, y la respuesta de Luxury leída en voz alta.
  // **Una** burbuja de quien habla (no la sugerencia «¿Quién falta por responder?»), con la frase entera: Vosk la
  // cierra en cada pausa corta y antes salía partida en dos mensajes. La primera palabra puede salir mal («kim»):
  // es la precisión del modelo pequeño, y Luxury entiende igual.
  await expect(panel.locator('p.self-end')).toHaveCount(1, { timeout: 60_000 })
  await expect(panel.locator('p.self-end')).toHaveText(/falta por responder$/i)
  await expect(panel).toContainText(/Faltan por responder|Ya respondieron todos/, { timeout: 20_000 })
  await expect.poll(() => page.evaluate(() => (window as unknown as { __leido: string[] }).__leido.join(' '))).toMatch(/Faltan por responder|Ya respondieron todos/)
  // El Service Worker no guarda el dictado otra vez (45 MB duplicados en un iPhone): lo guarda el navegador.
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  const enCache = await page.evaluate(async () => {
    const urls: string[] = []
    for (const nombre of await caches.keys()) for (const r of await (await caches.open(nombre)).keys()) urls.push(r.url)
    return urls.filter((u) => u.includes('/vosk/'))
  })
  expect(enCache).toEqual([])
  // La CSP de producción deja correr el motor (WebAssembly y su worker).
  expect(fallos.filter((f) => /Content Security Policy|Refused|wasm|Worker/i.test(f))).toEqual([])
  // El worker del dictado lleva su propia CSP; la página, la de siempre (sin `unsafe-eval`).
  const worker = await page.request.get('/vosk/vosk-worker-0.0.8.js')
  expect(worker.headers()['content-security-policy']).toContain("'unsafe-eval'")
  const pagina = await page.request.get(`/panel/eventos/${SLUG}/invitados`)
  expect(pagina.headers()['content-security-policy']).not.toMatch(/script-src[^;]*'unsafe-eval'/)
})

test('en Chrome de iPhone se le habla sin abrir el chat y responde en la tarjeta del robot', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 20)
  })
  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  await page.getByRole('button', { name: 'Hablarle a Luxury sin abrir el chat' }).click()
  const tarjeta = page.getByRole('status').filter({ hasText: 'Abrir el chat' })
  await expect(tarjeta).toContainText(/Faltan por responder|Ya respondieron todos/, { timeout: 60_000 })
  await expect(page.locator('dialog[open]')).toHaveCount(0)
})
