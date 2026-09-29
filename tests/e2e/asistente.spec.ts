import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { ADMIN_AUTH_STATE, AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **Luxury** (28 de septiembre) con el modelo guionizado (`ASISTENTE_MODELO=falso`): nunca se llama a
 * OpenAI. Se recorre el camino entero: el botón solo en Alta Costura, la respuesta por trozos, la
 * propuesta de invitados que no guarda nada hasta «Confirmar», la consulta con datos reales, el rechazo
 * de lo que no es del evento, la cuota contada y el 404 para un plan que no lo trae.
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

test('Luxury registra un invitado solo cuando se confirma, responde con los datos y rechaza lo que no es del evento', async ({ page }) => {
  await seedInvitation({ slug: SLUG, plan: 'alta-costura' })
  await escribirInvitacion(SLUG)

  await page.goto(`/panel/eventos/${SLUG}/invitados`)
  await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
  const panel = page.locator('dialog[open]')
  await expect(panel.getByRole('heading', { name: 'Luxury' })).toBeVisible()

  await panel.getByLabel('Escríbele a Luxury').fill('Crea a Ramón Pérez, 70012345')
  await panel.getByLabel('Escríbele a Luxury').press('Enter')
  const tarjeta = panel.getByRole('region', { name: 'Invitados para confirmar' })
  await expect(tarjeta).toContainText('Ramón Pérez')
  await expect(tarjeta).toContainText('WhatsApp 70012345')
  await expect(panel).toContainText('Te dejé a Ramón Pérez listo para confirmar.')
  // Proponer no guarda.
  const cuantos = async () => (await sql<{ n: number }[]>`select count(*)::int as n from guest_people p join guest_groups g on g.id = p.guest_group_id join events e on e.id = g.event_id where e.slug = ${SLUG} and p.full_name = 'Ramón Pérez'`)[0]!.n
  expect(await cuantos()).toBe(0)

  await tarjeta.getByRole('button', { name: 'Confirmar' }).click()
  await expect(tarjeta).toContainText('Guardado.')
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
})

test('Luxury propone una tarea y solo la crea al confirmar, con la acción de la pantalla', async ({ page }) => {
  await page.goto(`/panel/eventos/${SLUG}/planner/tareas`)
  await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
  const panel = page.locator('dialog[open]')
  await panel.getByLabel('Escríbele a Luxury').fill('Agrega la tarea Probar el menú con el catering')
  await panel.getByLabel('Escríbele a Luxury').press('Enter')
  const tarjeta = panel.getByRole('region', { name: 'Tareas para confirmar' })
  await expect(tarjeta).toContainText('Probar el menú con el catering')
  const cuantas = async () => (await sql<{ n: number }[]>`select count(*)::int as n from planner_tasks t join events e on e.id = t.event_id where e.slug = ${SLUG} and t.title = 'Probar el menú con el catering'`)[0]!.n
  expect(await cuantas()).toBe(0)

  await tarjeta.getByRole('button', { name: 'Confirmar' }).click()
  await expect(tarjeta).toContainText('Guardado.')
  expect(await cuantas()).toBe(1)
  await expect(panel.getByRole('link', { name: '/planner/tareas' })).toBeVisible()
})

test.describe('hablarle', () => {
  test.use({ permissions: ['microphone'] })

  test('con el reconocimiento del navegador, lo dicho aparece en el campo, se revisa y se envía', async ({ page }) => {
    // Un reconocedor de mentira: «oye» la pregunta en dos trozos, como el de verdad.
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
        }
        stop() {
          this.onend?.()
        }
        abort() {}
      }
      Object.assign(window, { webkitSpeechRecognition: Falso, SpeechRecognition: undefined })
    })
    await page.goto(`/panel/eventos/${SLUG}/invitados`)
    await page.getByRole('button', { name: 'Abrir a Luxury, tu asistente' }).click()
    const panel = page.locator('dialog[open]')
    await panel.getByRole('button', { name: 'Hablarle a Luxury' }).click()
    await expect(panel.getByLabel('Escríbele a Luxury')).toHaveValue('¿Quién falta por responder?')
    await panel.getByRole('button', { name: 'Terminar de hablar' }).click()
    await expect(panel.getByText('Revisa cómo quedó escrito')).toBeVisible()
    await panel.getByRole('button', { name: 'Enviar' }).click()
    await expect(panel).toContainText(/Faltan por responder: .*Ramón Pérez/)
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
      await expect(page.getByRole('switch', { name: 'Alta Costura' })).toBeChecked()
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
