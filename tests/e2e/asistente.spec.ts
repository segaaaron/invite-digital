import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE, AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **Luxury** (28 de septiembre) con el modelo guionizado (`ASISTENTE_MODELO=falso`): nunca se llama a
 * OpenAI. Se recorre el camino entero: el botón solo en Alta Costura, la respuesta por trozos, lo que
 * pide hecho en el momento (y el panel repintado), la consulta con datos reales, el rechazo de lo que no
 * es del evento, la cuota contada y el 404 para un plan que no lo trae.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const SLUG = 'arturo-e2e'
const SLUG_BASICO = 'arturo-basico-e2e'

test.use({ storageState: AUTH_STATE })
test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await deleteEvent(SLUG)
  await deleteEvent(SLUG_BASICO)
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('Luxury registra un invitado en el momento, responde con los datos y rechaza lo que no es del evento', async ({ page }) => {
  await seedInvitation({ slug: SLUG, plan: 'alta-costura' })
  await escribirInvitacion(SLUG)

  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
  const panel = page.locator('dialog[open]')
  await expect(panel.getByRole('heading', { name: 'Luxury' })).toBeVisible()

  await panel.getByLabel('Escríbele a Luxury').fill('Crea a Ramón Pérez, 70012345')
  await panel.getByLabel('Escríbele a Luxury').press('Enter')
  // Lo hace, sin tarjeta ni «Confirmar», y dice lo que la acción dio por hecho.
  await expect(panel).toContainText('Hecho: 1 invitación · 1 persona en la lista.')
  await expect(panel.getByRole('button', { name: 'Confirmar' })).toHaveCount(0)
  const cuantos = async () => (await sql<{ n: number }[]>`select count(*)::int as n from guest_people p join guest_groups g on g.id = p.guest_group_id join events e on e.id = g.event_id where e.slug = ${SLUG} and p.full_name = 'Ramón Pérez'`)[0]!.n
  expect(await cuantos()).toBe(1)
  const [grupo] = await sql<{ phone: string }[]>`select g.phone from guest_groups g join events e on e.id = g.event_id where e.slug = ${SLUG} and g.label = 'Ramón Pérez'`
  expect(grupo!.phone).toBe('+59170012345')

  // Con los datos reales: Ramón acaba de entrar y no respondió.
  await panel.getByLabel('Escríbele a Luxury').fill('¿Quién falta por responder?')
  await panel.getByRole('button', { name: 'Enviar' }).click()
  await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)

  await panel.getByLabel('Escríbele a Luxury').fill('¿Cuándo es el fin del mundo?')
  await panel.getByRole('button', { name: 'Enviar' }).click()
  await expect(panel).toContainText('Eso no lo puedo resolver yo; lo mío es tu evento.')

  // Cada mensaje cuenta para la cuota del evento.
  const [uso] = await sql<{ messages: number }[]>`select u.messages from assistant_usage u join events e on e.id = u.event_id where e.slug = ${SLUG}`
  expect(uso!.messages).toBe(3)

  // El panel de detrás se repinta solo: Ramón está en la lista sin recargar.
  await panel.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('main').getByText('Ramón Pérez').and(page.locator(':not(dialog *)')).first()).toBeVisible()
})

test('Luxury crea y borra una tarea cuando se le pide, y la pantalla de detrás lo enseña', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/planner/tareas`)
  await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
  const panel = page.locator('dialog[open]')
  const cuantas = async () => (await sql<{ n: number }[]>`select count(*)::int as n from planner_tasks t join events e on e.id = t.event_id where e.slug = ${SLUG} and t.title = 'Probar el menú con el catering'`)[0]!.n

  await panel.getByLabel('Escríbele a Luxury').fill('Agrega la tarea Probar el menú con el catering')
  await panel.getByLabel('Escríbele a Luxury').press('Enter')
  await expect(panel).toContainText('Hecho:')
  expect(await cuantas()).toBe(1)
  // La pantalla de detrás (fuera del chat) se repinta sola.
  const enLaPantalla = page.getByRole('main').getByText('Probar el menú con el catering').filter({ hasNot: page.locator('dialog') }).and(page.locator(':not(dialog *)'))
  await expect(enLaPantalla.first()).toBeAttached()

  await panel.getByLabel('Escríbele a Luxury').fill('Borra la tarea Probar el menú con el catering')
  await panel.getByLabel('Escríbele a Luxury').press('Enter')
  await expect(panel.getByText('Hecho:')).toHaveCount(2)
  expect(await cuantas()).toBe(0)
  await expect(enLaPantalla).toHaveCount(0)
})

test.describe('hablarle', () => {
  test.use({ permissions: ['microphone'] })

  test('se le habla y, al callarse, envía solo y contesta en voz alta', async ({ page }) => {
    // Un reconocedor de mentira: «oye» la pregunta en dos trozos y se calla, como el de verdad. Y una voz de
    // mentira que apunta lo que Luxury lee en voz alta.
    await page.addInitScript(() => {
      class Falso {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          setTimeout(() => this.onresult?.({ results: [[{ transcript: '¿Quién falta' }]] }), 50)
          setTimeout(() => this.onresult?.({ results: [[{ transcript: '¿Quién falta por responder?' }]] }), 100)
          setTimeout(() => this.onend?.(), 300)
        }
        stop() {
          this.onend?.()
        }
        abort() {}
      }
      const leido: string[] = []
      Object.assign(window, { webkitSpeechRecognition: Falso, SpeechRecognition: undefined, __leido: leido })
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void leido.push(u.text)
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    // Sin tocar «Enviar»: al callarse, lo dicho sale y Luxury responde.
    await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)
    await expect(panel.getByLabel('Escríbele a Luxury')).toHaveValue('')
    await expect.poll(() => page.evaluate(() => (window as unknown as { __leido: string[] }).__leido.join(' '))).toContain('Faltan por responder')
  })

  test('modo conversación: contesta en voz alta, vuelve a escuchar solo y «listo» lo termina', async ({ page }) => {
    // Dos turnos: la pregunta y «listo». La voz de mentira avisa al terminar cada frase, como la de verdad.
    await page.addInitScript(() => {
      const dichos = ['¿Quién falta por responder?', 'listo']
      const w = window as unknown as { __arranques: number; __leido: string[] }
      w.__arranques = 0
      w.__leido = []
      class Falso {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          const dicho = dichos[w.__arranques] ?? ''
          w.__arranques += 1
          setTimeout(() => this.onresult?.({ results: [[{ transcript: dicho }]] }), 50)
          setTimeout(() => this.onend?.(), 120)
        }
        stop() {
          this.onend?.()
        }
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Falso, SpeechRecognition: undefined })
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        if (u.text !== '') w.__leido.push(u.text)
        setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 30)
      }
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel.getByText('Conversación por voz · di «listo» para terminar')).toBeVisible()
    await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)
    const leido = () => page.evaluate(() => (window as unknown as { __leido: string[] }).__leido.join(' '))
    await expect.poll(leido).toContain('Faltan por responder')
    // Al callarse Luxury, el micrófono se abrió solo; «listo» terminó sin mandarle nada.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __arranques: number }).__arranques)).toBe(2)
    await expect.poll(leido).toContain('Cuando quieras.')
    await expect(panel.getByText('Conversación por voz · di «listo» para terminar')).toHaveCount(0)
    await expect(panel.getByText('listo', { exact: true })).toHaveCount(0)
  })

  test('la voz se elige oyéndola: sin voces de efecto, y se recuerda', async ({ page }) => {
    // Las voces de un iPhone: las de efecto (Eloquence) y Paulina. Utterance y voz de mentira apuntan con qué voz habla.
    await page.addInitScript(() => {
      const voces = [
        { name: 'Eddy (Español (México))', lang: 'es-MX', voiceURI: 'com.apple.eloquence.es-MX.Eddy' },
        { name: 'Flo (Español (México))', lang: 'es-MX', voiceURI: 'com.apple.eloquence.es-MX.Flo' },
        { name: 'Paulina', lang: 'es-MX', voiceURI: 'com.apple.voice.compact.es-MX.Paulina' },
        { name: 'Mónica', lang: 'es-ES', voiceURI: 'com.apple.voice.compact.es-ES.Monica' },
        { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha' },
      ]
      const w = window as unknown as { __hablo: string[] }
      w.__hablo = []
      class Frase {
        text: string
        lang = ''
        voice: { name: string } | null = null
        onend: (() => void) | null = null
        onerror: (() => void) | null = null
        constructor(t: string) {
          this.text = t
        }
      }
      Object.assign(window, { SpeechSynthesisUtterance: Frase })
      Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => voces })
      window.speechSynthesis.speak = ((u: Frase) => {
        if (u.text !== '') w.__hablo.push(`${u.voice?.name ?? 'sistema'}: ${u.text}`)
        setTimeout(() => u.onend?.(), 20)
      }) as unknown as typeof window.speechSynthesis.speak
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Voz', exact: true }).click()
    const espanol = panel.getByLabel('Voz en español')
    await expect(espanol.locator('option')).toHaveText(['Automática (la mejor de tu aparato)', 'Paulina · es-MX', 'Mónica · es-ES'])
    await espanol.selectOption({ label: 'Mónica · es-ES' })
    await panel.getByRole('button', { name: 'Probar' }).first().click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __hablo: string[] }).__hablo.join(' | '))).toContain('Mónica: Hola, soy Luxury')
    // Se recuerda en este aparato.
    await page.reload()
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    await panel.getByRole('button', { name: 'Voz', exact: true }).click()
    await expect(panel.getByLabel('Voz en español')).toHaveValue('com.apple.voice.compact.es-ES.Monica')
  })

  test('en Android, si la voz no avisa de que terminó, la conversación sigue igual', async ({ page }) => {
    await page.addInitScript(() => {
      const dichos = ['¿Quién falta por responder?', 'listo']
      const w = window as unknown as { __arranques: number }
      w.__arranques = 0
      class Falso {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          const dicho = dichos[w.__arranques] ?? ''
          w.__arranques += 1
          setTimeout(() => this.onresult?.({ results: [[{ transcript: dicho }]] }), 50)
          setTimeout(() => this.onend?.(), 120)
        }
        stop() {
          this.onend?.()
        }
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Falso, SpeechRecognition: undefined })
      // Empieza a sonar y nunca dice que acabó (pasa con la voz de Google en algunos Android).
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        setTimeout(() => u.onstart?.(new Event('start') as SpeechSynthesisEvent), 10)
      }
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __arranques: number }).__arranques), { timeout: 20_000 }).toBe(2)
  })

  test('se le habla sin abrir el chat: responde en la tarjeta del robot y el chat lo guarda', async ({ page }) => {
    await page.addInitScript(() => {
      const dichos = ['¿Quién falta por responder?', 'listo']
      const w = window as unknown as { __arranques: number; __leido: string[] }
      w.__arranques = 0
      w.__leido = []
      class Falso {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          const dicho = dichos[w.__arranques] ?? ''
          // El «listo» llega con una pausa, como cuando una persona escucha la respuesta antes de contestar.
          const pausa = w.__arranques === 0 ? 0 : 1500
          w.__arranques += 1
          setTimeout(() => this.onresult?.({ results: [[{ transcript: dicho }]] }), 50 + pausa)
          setTimeout(() => this.onend?.(), 120 + pausa)
        }
        stop() {
          this.onend?.()
        }
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Falso, SpeechRecognition: undefined })
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        if (u.text !== '') w.__leido.push(u.text)
        setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 30)
      }
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Hablarle a Luxury sin abrir el chat' }).click()
    // Responde en la tarjeta del robot, en voz alta, y el chat sigue cerrado.
    const tarjeta = page.getByRole('status').filter({ hasText: 'Abrir el chat' })
    await expect(tarjeta).toContainText(/Faltan por responder: .*Ramón Pérez/)
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __leido: string[] }).__leido.join(' '))).toContain('Faltan por responder')
    // Vuelve a escuchar sola; «listo» termina.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __arranques: number }).__arranques)).toBe(2)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __leido: string[] }).__leido.join(' '))).toContain('Cuando quieras.')
    await expect(tarjeta).toContainText('Cuando quieras. Toca el micrófono si me necesitas.')
    // El chat guardó la conversación.
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    await expect(page.locator('dialog[open]')).toContainText('¿Quién falta por responder?')
    await expect(page.locator('dialog[open]')).toContainText(/Faltan por responder: .*Ramón Pérez/)
  })

  test('si los permisos del aparato tardan (iPhone: micrófono y reconocimiento), igual oye y responde', async ({ page }) => {
    test.setTimeout(45_000)
    // Producción, 9 de octubre: los 8 s de silencio contaban desde el toque y se cerraba mientras se aceptaban los
    // permisos. Aquí el micrófono empieza a grabar a los 9 s.
    await page.addInitScript(() => {
      class Lento {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        onaudiostart: (() => void) | null = null
        start() {
          setTimeout(() => this.onaudiostart?.(), 9000)
          setTimeout(() => this.onresult?.({ results: [[{ transcript: '¿Quién falta por responder?' }]] }), 9300)
          setTimeout(() => this.onend?.(), 9400)
        }
        stop() {
          this.onend?.()
        }
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Lento, SpeechRecognition: undefined })
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 20)
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/, { timeout: 20_000 })
  })

  test('fuera del chat, sin permiso del micrófono, la tarjeta dice cómo darlo', async ({ page }) => {
    await page.addInitScript(() => {
      class SinPermiso {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 50)
          setTimeout(() => this.onend?.(), 80)
        }
        stop() {}
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: SinPermiso, SpeechRecognition: undefined })
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Hablarle a Luxury sin abrir el chat' }).click()
    const tarjeta = page.getByRole('status').filter({ hasText: 'Abrir el chat' })
    await expect(tarjeta).toContainText('permite el micrófono')
    // Se queda a la vista para leerlo (antes se iba a los 6 s).
    await page.waitForTimeout(7000)
    await expect(tarjeta).toContainText('permite el micrófono')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
  })

  test('si al primer intento no oye nada, la conversación se suelta (no se queda «Pensando…»)', async ({ page }) => {
    await page.addInitScript(() => {
      class Calla {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          setTimeout(() => this.onend?.(), 80)
        }
        stop() {}
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Calla, SpeechRecognition: undefined })
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel.getByText('Conversación por voz · di «listo» para terminar')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Hablarle a Luxury' })).toBeEnabled()
  })

  test('«Hablar con Luxury» desde el icono del panel instalado lo abre ya escuchando', async ({ page }) => {
    await page.addInitScript(() => {
      class Escucha {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {}
        stop() {}
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Escucha, SpeechRecognition: undefined })
    })
    // El acceso del manifiesto (Android: mantener pulsado el icono).
    const manifiesto = (await (await page.request.get('/panel.webmanifest')).json()) as { shortcuts?: { url: string }[] }
    expect(manifiesto.shortcuts?.map((x) => x.url)).toContain('/panel/luxury')
    await page.goto('/panel/luxury')
    await expect(page).toHaveURL(/\/panel\/eventos\/[^/?]+$/)
    await expect(page.locator('dialog[open]').getByText('Te escucho…', { exact: true })).toBeVisible()
  })

  test('escribir mientras escucha corta la escucha y deja enviar', async ({ page }) => {
    // Un reconocedor que no avisa nunca de que terminó (pasa en iPhone): antes dejaba «Enviar» bloqueado.
    await page.addInitScript(() => {
      class Mudo {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {}
        stop() {}
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Mudo, SpeechRecognition: undefined })
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel.getByRole('button', { name: 'Terminar de hablar y enviar' })).toBeVisible()
    await panel.getByLabel('Escríbele a Luxury').fill('¿Quién falta por responder?')
    await expect(panel.getByRole('button', { name: 'Hablarle a Luxury' })).toBeVisible()
    await panel.getByRole('button', { name: 'Enviar' }).click()
    await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)
  })

  test.describe('en el panel instalado en un iPhone', () => {
    // Safari no trae el dictado del navegador en las apps de la pantalla de inicio (WebKit 225298).
    test.use({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    })

    test('el micrófono abre el teclado; lo dictado se envía al terminar y se contesta en voz alta', async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'standalone', { value: true })
        const leido: string[] = []
        Object.assign(window, { __leido: leido })
        window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void leido.push(u.text)
      })
      await page.goto(`/panel/eventos/${SLUG}/invitados`)
      await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
      const panel = page.locator('dialog[open]')
      await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
      await expect(panel.getByText(/Dicta con el micrófono de tu teclado/)).toBeVisible()
      const campo = panel.getByLabel('Escríbele a Luxury')
      await expect(campo).toBeFocused()

      // El dictado de iOS escribe en «composición»: un Enter en mitad no envía lo que aún no está.
      await campo.evaluate((t: HTMLTextAreaElement) => {
        t.dispatchEvent(new CompositionEvent('compositionstart'))
        t.value = '¿Quién falta por responder?'
        t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true }))
      })
      await expect(panel.getByText(/Faltan por responder/)).toHaveCount(0)
      // Termina el dictado: el estado no se enteró (sin `input`), pero se envía lo que dice el campo.
      await campo.evaluate((t: HTMLTextAreaElement) => t.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })))
      await panel.getByRole('button', { name: 'Enviar' }).click()
      await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)
      await expect.poll(() => page.evaluate(() => (window as unknown as { __leido: string[] }).__leido.join(' '))).toContain('Faltan por responder')
    })
  })

  test('en Safari del iPhone, si el dictado falla, pasa al teclado y queda en el registro de fallos', async ({ browser }) => {
    const contexto = await browser.newContext({
      storageState: AUTH_STATE,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
      permissions: ['microphone'],
    })
    const page = await contexto.newPage()
    await sql`delete from service_failures where message like '%Voz de Luxury:%'`
    await page.addInitScript(() => {
      class Roto {
        lang = ''
        interimResults = false
        continuous = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        start() {
          ;(window as unknown as { __lang: string }).__lang = this.lang
          setTimeout(() => this.onerror?.({ error: 'service-not-allowed' }), 50)
          setTimeout(() => this.onend?.(), 80)
        }
        stop() {}
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Roto, SpeechRecognition: undefined })
      Object.defineProperty(navigator, 'language', { value: 'es-BO' })
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel.getByText(/Dicta con el micrófono de tu teclado/)).toBeVisible()
    await expect(panel.getByLabel('Escríbele a Luxury')).toBeFocused()
    // El dictado de Apple no trae es-BO: se le pide es-MX.
    expect(await page.evaluate(() => (window as unknown as { __lang: string }).__lang)).toBe('es-MX')
    await expect
      .poll(async () => (await sql<{ n: number }[]>`select count(*)::int as n from service_failures where message like '%Voz de Luxury: el dictado del navegador falló (service-not-allowed)%'`)[0]!.n)
      .toBe(1)
    await sql`delete from service_failures where message like '%Voz de Luxury:%'`
    await contexto.close()
  })

  test('el micrófono queda permitido aunque se entre al panel por otra página', async ({ page }) => {
    // La política de permisos la fija la primera página que carga el navegador y no cambia al navegar dentro
    // del panel: quien entraba por la bandeja y llegaba al evento con clics tenía el micrófono prohibido.
    for (const ruta of ['/panel', '/panel/entrar', '/panel/ayuda']) {
      const r = await page.request.get(ruta, { maxRedirects: 0 })
      expect(r.headers()['permissions-policy'], ruta).toContain('microphone=(self)')
      expect(r.headers()['permissions-policy'], ruta).toContain('camera=(self)')
    }
    await page.goto('/panel/ayuda')
    expect(await page.evaluate(() => (document as unknown as { featurePolicy?: { allowsFeature(f: string): boolean } }).featurePolicy?.allowsFeature('microphone'))).toBe(true)
    // El escáner del portero, con cámara.
    const portero = await page.request.get('/p/no-existe/puerta', { maxRedirects: 0 })
    expect(portero.headers()['permissions-policy']).toContain('camera=(self)')
  })

  test('sin reconocimiento en el navegador (Firefox) no hay micrófono: se escribe', async ({ page }) => {
    await page.addInitScript(() => Object.assign(window, { webkitSpeechRecognition: undefined, SpeechRecognition: undefined }))
    const respuesta = await page.goto(`/panel/eventos/${SLUG}/invitados`)
    // El micrófono solo se abre al propio sitio y en las páginas del evento: sin esto, el navegador lo niega.
    expect(respuesta!.headers()['permissions-policy']).toContain('microphone=(self)')
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await expect(panel.getByLabel('Escríbele a Luxury')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Hablarle a Luxury' })).toHaveCount(0)
  })
})

test('«Oye Siri, Luxury»: la llave de Mi cuenta solo vale en la ruta de Siri, y Siri recibe texto para leer', async ({ page, playwright }) => {
  await page.goto('/panel/cuenta#siri')
  // Sin enlace de iCloud, el atajo firmado se descarga de aquí.
  await expect(page.getByRole('link', { name: 'Descargar el atajo' })).toHaveAttribute('href', '/siri/Luxury.shortcut')
  const atajo = await page.request.get('/siri/Luxury.shortcut')
  expect(atajo.status()).toBe(200)
  expect((await atajo.body()).subarray(0, 4).toString()).toBe('AEA1')
  await page.getByRole('button', { name: 'Crear mi llave' }).click()
  const llave = await page.getByLabel('Tu llave de Siri').inputValue()
  expect(llave).toMatch(/^[A-Za-z0-9_-]{20,}$/)

  // Sin cookie, como el Atajo de Apple.
  const siri = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL ?? 'http://localhost:3100', storageState: { cookies: [], origins: [] } })
  const pregunta = (clave: string) => siri.post('/panel/luxury/siri', { headers: { authorization: `Bearer ${clave}` }, data: { texto: '¿Quién falta por responder?' } })
  const bien = await pregunta(llave)
  expect(bien.headers()['content-type']).toContain('text/plain')
  expect(await bien.text()).toMatch(/Faltan por responder|Ya respondieron todos/)
  expect(await (await pregunta('llave-que-no-existe-0000000')).text()).toContain('ya no vale')
  // La llave no abre nada más: en cualquier otra ruta, a la puerta.
  const fuera = await siri.get('/panel/cuenta', { headers: { authorization: `Bearer ${llave}` }, maxRedirects: 0 })
  expect(fuera.status()).toBe(307)
  expect(fuera.headers()['location']).toContain('/panel/entrar')
  await siri.dispose()

  // Se ve en las sesiones abiertas como una más.
  await page.reload()
  await expect(page.getByText('Atajo de Siri').first()).toBeVisible()
  await sql`delete from sessions where device = 'Atajo de Siri'`
})

test('con la cuota del mes gastada lo dice y no responde', async ({ page }) => {
  const [evento] = await sql<{ id: string }[]>`select id from events where slug = ${SLUG}`
  await sql`update assistant_usage set messages = 300 where event_id = ${evento!.id}`
  await page.goto(`/panel/eventos/${SLUG}`)
  const respuesta = await page.request.post(`/panel/eventos/${SLUG}/asistente`, { data: { mensajes: [{ rol: 'usuario', texto: 'Hola' }] } })
  expect(respuesta.status()).toBe(200)
  expect(await respuesta.text()).toContain('ya usaste todos los mensajes')
})

test('un plan sin Luxury lo ve con candado y cómo conseguirlo; la ruta responde 404', async ({ page }) => {
  await seedInvitation({ slug: SLUG_BASICO, plan: 'atelier' })
  await escribirInvitacion(SLUG_BASICO)
  await page.goto(`/panel/eventos/${SLUG_BASICO}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Conocer a Luxury, tu planner con IA' }).click()
  const dialogo = page.locator('dialog[open]')
  await expect(dialogo).toContainText('Carga a tus invitados')
  // El atelier dueño mejora cambiando de plan.
  await expect(dialogo.getByRole('link', { name: 'Ver planes' })).toHaveAttribute('href', `/panel/eventos/${SLUG_BASICO}/plan`)
  const respuesta = await page.request.post(`/panel/eventos/${SLUG_BASICO}/asistente`, { data: { mensajes: [{ rol: 'usuario', texto: 'Hola' }] } })
  expect(respuesta.status()).toBe(404)
})

test('con Luxury comprado como extra, un plan que no lo trae lo usa', async ({ page }) => {
  const [evento] = await sql<{ id: string }[]>`select id from events where slug = ${SLUG_BASICO}`
  await sql`insert into event_addons (event_id, addon_slug, effect, amount) values (${evento!.id}, 'luxury', 'asistente', 0)`
  await page.goto(`/panel/eventos/${SLUG_BASICO}`)
  await expect(page.getByRole('button', { name: 'Conocer a Luxury, tu planner con IA' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
  const panel = page.locator('dialog[open]')
  await panel.getByLabel('Escríbele a Luxury').fill('¿Quién falta por responder?')
  await panel.getByRole('button', { name: 'Enviar' }).click()
  await expect(panel).toContainText(/Faltan por responder|Ya respondieron todos/)
})

test.describe('Admin › Asistente', () => {
  test.use({ storageState: ADMIN_AUTH_STATE })

  test('el admin ve el gasto del mes y guarda los topes', async ({ page }) => {
    const antes = (await sql<{ value: string }[]>`select value from app_settings where key = 'asistente.config'`)[0]?.value ?? null
    try {
      await page.goto('/panel/admin/asistente')
      await expect(page.getByRole('heading', { name: 'Asistente', level: 1 })).toBeVisible()
      await expect(page.getByText('Gastado este mes')).toBeVisible()
      await expect(page.getByRole('switch', { name: 'Imperial' })).toBeChecked()
      await page.getByLabel('Mensajes por evento y mes').fill('250')
      await page.getByRole('button', { name: 'Guardar' }).click()
      await expect(page.getByText('Guardado.')).toBeVisible()
      const [guardado] = await sql<{ value: string }[]>`select value from app_settings where key = 'asistente.config'`
      expect(JSON.parse(guardado!.value)).toMatchObject({ planes: ['alta-costura'], mensajesPorMes: 250, presupuestoUsd: 20 })
    } finally {
      if (antes === null) await sql`delete from app_settings where key = 'asistente.config'`
      else await sql`update app_settings set value = ${antes} where key = 'asistente.config'`
    }
  })
})

/**
 * **Luxury hace cosas del evento** (7 de octubre): envía, cambia invitados, escribe la invitación, crea
 * mesas, carga regalos y agradece mensajes. **Lo hace en el momento** con las mismas acciones de las
 * pantallas; solo el envío por WhatsApp lleva tarjeta, porque cada mensaje necesita el toque de la persona.
 */
test.describe('Luxury hace cosas del evento', () => {
  // La prueba de la cuota deja el mes gastado: aquí se vuelve a empezar.
  test.beforeEach(async () => {
    await sql`update assistant_usage set messages = 0 where event_id = (select id from events where slug = ${SLUG})`
  })

  const abrir = async (page: import('@playwright/test').Page, ruta = '') => {
    await page.goto(`/panel/eventos/${SLUG}${ruta}`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    return page.locator('dialog[open]')
  }
  /** Una invitación de una persona, sembrada directa (lo que se prueba aquí es Luxury, no el alta). */
  const seedPersona = async (nombre: string, codigo: string | null = null) => {
    const [g] = await sql<{ id: string }[]>`insert into guest_groups (event_id, label, seats, token_hash, pass_code) select id, ${nombre}, 1, ${randomBytes(32)}, ${codigo} from events where slug = ${SLUG} returning id`
    await sql`insert into guest_people (guest_group_id, full_name, is_companion) values (${g!.id}, ${nombre}, false)`
  }
  const pedir = async (panel: import('@playwright/test').Locator, texto: string) => {
    await panel.getByLabel('Escríbele a Luxury').fill(texto)
    await panel.getByLabel('Escríbele a Luxury').press('Enter')
  }

  test('prepara el envío: un botón de WhatsApp por invitado que abre su chat y la deja enviada', async ({ page }) => {
    const panel = await abrir(page)
    await pedir(panel, 'Manda las invitaciones que faltan')
    const tarjeta = panel.getByRole('region', { name: 'Invitaciones para enviar' })
    const boton = tarjeta.getByRole('button', { name: 'Mandar por WhatsApp a Ramón Pérez' })
    await expect(boton).toBeVisible()
    const chat = page.waitForEvent('popup')
    await boton.click()
    await (await chat).close()
    await expect(tarjeta).toContainText('Enviada ✓')
    const [g] = await sql<{ enviada: boolean }[]>`select g.invitation_sent_at is not null as enviada from guest_groups g join events e on e.id = g.event_id where e.slug = ${SLUG} and g.label = 'Ramón Pérez'`
    expect(g!.enviada).toBe(true)
  })

  test('escribe la invitación sin tocar lo demás y conserva lo que ya había', async ({ page }) => {
    const bloques = async () => (await sql<{ blocks: Record<string, Record<string, unknown>> }[]>`select c.blocks from event_content c join events e on e.id = c.event_id where e.slug = ${SLUG}`)[0]!.blocks
    const antes = await bloques()
    const panel = await abrir(page, '/configuracion')
    await pedir(panel, 'Escribe la invitación de Ana y Luis')
    await expect(panel).toContainText('Hecho:')
    const despues = await bloques()
    expect(despues.hero).toMatchObject({ nameA: 'Ana', nameB: 'Luis' })
    expect(despues.dressCode).toMatchObject({ title: 'Formal' })
    // Lo que no tocó, igual: la recepción escrita antes sigue.
    expect(despues.reception).toEqual(antes.reception)
  })

  test('crea mesas y carga un regalo', async ({ page }) => {
    const panel = await abrir(page, '/mesas')
    await pedir(panel, 'Crea 2 mesas de 8')
    await expect(panel).toContainText('Hecho:')
    const [m] = await sql<{ n: number }[]>`select count(*)::int as n from venue_tables t join events e on e.id = t.event_id where e.slug = ${SLUG} and t.label like 'Mesa Luxury %' and t.capacity = 8`
    expect(m!.n).toBe(2)

    await pedir(panel, 'Agrega el regalo Cafetera de 500')
    await expect(panel.getByText('Hecho:')).toHaveCount(2)
    const [r] = await sql<{ precio: number }[]>`select g.price_cents as precio from gifts g join events e on e.id = g.event_id where e.slug = ${SLUG} and g.name = 'Cafetera'`
    expect(r!.precio).toBe(50000)
  })

  test('agradece los mensajes del libro de firmas', async ({ page }) => {
    const [g] = await sql<{ id: string }[]>`select g.id from guest_groups g join events e on e.id = g.event_id where e.slug = ${SLUG} order by g.created_at limit 1`
    const [respuesta] = await sql<{ id: string }[]>`insert into rsvp_responses (guest_group_id, attending, message) values (${g!.id}, 1, 'Felicidades a los dos') returning id`
    const panel = await abrir(page, '/mensajes')
    await pedir(panel, 'Agradece los mensajes')
    await expect(panel).toContainText('Hecho:')
    const [nota] = await sql<{ reply: string | null }[]>`select reply from message_notes where rsvp_response_id = ${respuesta!.id}`
    expect(nota!.reply).toBe('¡Gracias por tus palabras!')
  })

  test('quita a un invitado cuando se le pide', async ({ page }) => {
    const cuantos = async () => (await sql<{ n: number }[]>`select count(*)::int as n from guest_people p join guest_groups g on g.id = p.guest_group_id join events e on e.id = g.event_id where e.slug = ${SLUG} and p.full_name = 'Ramón Pérez'`)[0]!.n
    expect(await cuantos()).toBe(1)
    const panel = await abrir(page, '/invitados')
    await pedir(panel, 'Quita a Ramón Pérez')
    await expect(panel).toContainText('Hecho:')
    expect(await cuantos()).toBe(0)
  })

  test('una foto adjunta en el chat se sube y Luxury la pone en la galería', async ({ page }) => {
    // Un diseño con galería: el clásico no pinta fotos.
    await sql`update events set theme_key = 'boda' where slug = ${SLUG}`
    const panel = await abrir(page, '/configuracion')
    const foto = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 180, g: 140, b: 120 } } }).jpeg().toBuffer()
    await panel.getByLabel('Escríbele a Luxury').fill('Ponla en la galería')
    await panel.locator('input[type=file]').setInputFiles({ name: 'nosotros.jpg', mimeType: 'image/jpeg', buffer: foto })
    await expect(panel).toContainText('📎 nosotros.jpg')
    await expect(panel).toContainText('Hecho: Foto puesta en la foto 1 de la galería.')
    const [c] = await sql<{ gallery: { imageId?: string }[] }[]>`select c.blocks->'gallery' as gallery from event_content c join events e on e.id = c.event_id where e.slug = ${SLUG}`
    const [m] = await sql<{ id: string }[]>`select m.id from event_media m join events e on e.id = m.event_id where e.slug = ${SLUG} and m.original_name like 'nosotros%'`
    expect(c!.gallery[0]!.imageId).toBe(m!.id)
  })

  test('el QR del banco adjunto en el chat queda como QR de la transferencia, sin gastar una foto', async ({ page }) => {
    const panel = await abrir(page, '/regalos')
    const qr = await sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 20, g: 20, b: 20 } } }).png().toBuffer()
    await panel.getByLabel('Escríbele a Luxury').fill('Este es el QR de mi banco')
    await panel.locator('input[type=file]').setInputFiles({ name: 'qr-bnb.png', mimeType: 'image/png', buffer: qr })
    await expect(panel).toContainText('Hecho: QR de la transferencia guardado y transferencia encendida.')
    const [f] = await sql<{ transferencia: boolean; con_qr: boolean }[]>`select w.transferencia, w.qr_imagen is not null as con_qr from event_gift_ways w join events e on e.id = w.event_id where e.slug = ${SLUG}`
    expect(f).toEqual({ transferencia: true, con_qr: true })
    const [m] = await sql<{ n: number }[]>`select count(*)::int as n from event_media m join events e on e.id = m.event_id where e.slug = ${SLUG} and m.original_name like 'qr-bnb%'`
    expect(m!.n).toBe(0)
  })

  test('marca que alguien no viene y suma personal de recepción con su PIN', async ({ page }) => {
    await seedPersona('Lucía Rojas')
    const panel = await abrir(page, '/invitados')
    await pedir(panel, 'Lucía Rojas no viene')
    await expect(panel).toContainText('Hecho: Asistencia marcada: no asiste.')
    const [p] = await sql<{ attending: string }[]>`select p.attending from guest_people p join guest_groups g on g.id = p.guest_group_id join events e on e.id = g.event_id where e.slug = ${SLUG} and p.full_name = 'Lucía Rojas'`
    expect(p!.attending).toBe('no')

    await pedir(panel, 'Suma a Carla Méndez a la puerta, 70011122')
    await expect(panel).toContainText(/Hecho: Carla Méndez está en recepción\. PIN \d{6}\./)
    const [r] = await sql<{ n: number }[]>`select count(*)::int as n from door_porters d join events e on e.id = d.event_id where e.slug = ${SLUG} and d.name = 'Carla Méndez' and d.revoked_at is null`
    expect(r!.n).toBe(1)
  })

  test('hace de recepción: encuentra el pase por su código, registra el ingreso y dice cómo va la puerta', async ({ page }) => {
    await seedPersona('Mario Gutiérrez', 'K7M2Q')
    const panel = await abrir(page, '/checkin')
    await pedir(panel, 'Llegó el pase k7m2q')
    await expect(panel).toContainText('Hecho: Ingreso registrado.')
    const [a] = await sql<{ n: number }[]>`select count(*)::int as n from arrivals a join guest_groups g on g.id = a.guest_group_id where g.pass_code = 'K7M2Q'`
    expect(a!.n).toBe(1)
    await pedir(panel, '¿Cuántos faltan por llegar?')
    await expect(panel).toContainText(/Dentro [1-9]\d* de \d+\./)
  })
})
