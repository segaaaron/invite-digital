import { expect, test } from '@playwright/test'
import postgres from 'postgres'
import { AUTH_STATE } from './fixtures/atelier'
import { escribirInvitacion } from './fixtures/invitacion-minima'
import { elegirFecha } from './helpers/panel'
import { invitationFixtures } from './fixtures/invitation'

/**
 * **La agenda** (29 de septiembre): una cita se agenda desde su día, sale en el mes y en la suscripción
 * `.ics`, que se corta si la persona pierde el acceso; y el invitado guarda el evento en su calendario.
 */
const { closeInvitationDb, deleteEvent, seedInvitation } = invitationFixtures()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })
const SLUG = 'agenda-e2e'

test.use({ storageState: AUTH_STATE })
test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await deleteEvent(SLUG)
  await closeInvitationDb()
  await sql.end({ timeout: 5 })
})

test('una cita se agenda desde su día, sale en el mes y en la suscripción del teléfono', async ({ page, request }) => {
  const { token } = await seedInvitation({ slug: SLUG, plan: 'imperial' })
  await escribirInvitacion(SLUG)

  await page.goto(`/panel/eventos/${SLUG}/planner/agenda?mes=2027-04&dia=2027-04-10&cita=nueva`)
  const dialogo = page.getByRole('dialog', { name: 'Nueva cita' })
  await dialogo.getByLabel('Qué').fill('Degustación del menú')
  await dialogo.getByLabel('Hora').selectOption('16:30')
  await dialogo.getByLabel('Dónde').fill('Catering Sabores, Av. Busch')
  await dialogo.getByRole('button', { name: 'Agendar' }).click()
  await expect(dialogo).toHaveCount(0)

  // Vuelve al día, que se abre entero en su diálogo, y la cita sale también en la casilla del mes.
  await expect(page.getByRole('dialog', { name: 'Sábado 10 de abril' })).toContainText('Degustación del menú')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /10 abr, 1 en la agenda/ })).toBeVisible()

  // La suscripción: un enlace privado que el calendario del teléfono lee sin sesión.
  await page.getByRole('button', { name: 'Ver en mi calendario' }).click()
  const abrir = page.getByRole('link', { name: 'Abrir en mi calendario' })
  await expect(abrir).toHaveAttribute('href', /^webcal:\/\/.+\/calendario\/[\w-]+$/)
  const enlace = (await abrir.getAttribute('href'))!.replace(/^webcal:\/\/[^/]+/, '')
  const ics = await request.get(enlace, { headers: { cookie: '' } })
  expect(ics.status()).toBe(200)
  expect(ics.headers()['content-type']).toContain('text/calendar')
  const cuerpo = await ics.text()
  expect(cuerpo).toContain('SUMMARY:Degustación del menú · Cita')
  expect(cuerpo).toContain('DTSTART:20270410T203000Z')
  expect(cuerpo).toContain('LOCATION:Catering Sabores\\, Av. Busch')

  // La suscripción trae alarmas, pero la pantalla no promete que el teléfono avise.
  expect(cuerpo).toContain('BEGIN:VALARM')
  await expect(page.getByText('el calendario del teléfono suele quitar las alertas')).toBeVisible()

  // Pedir otro enlace corta el anterior.
  await page.reload()
  await page.getByRole('button', { name: 'Ver en mi calendario' }).click()
  await expect(page.getByRole('link', { name: 'Abrir en mi calendario' })).toBeVisible()
  expect((await request.get(enlace)).status()).toBe(404)

  // El invitado guarda el evento en su calendario: la hora escrita en la invitación, en UTC.
  const delInvitado = await request.get(`/i/${token}/calendario`)
  expect(delInvitado.status()).toBe(200)
  const evento = await delInvitado.text()
  expect(evento).toContain('DTSTART:20270516T000000Z')
  expect(evento).toContain('LOCATION:Salón Los Ceibos')
  expect((await request.get('/i/no-existe/calendario')).status()).toBe(404)
})

test('lo atrasado sale arriba: se marca hecho (con deshacer), se cambia de fecha y los filtros ocultan', async ({ page }) => {
  const hace = (dias: number) => new Date(Date.now() - 4 * 3_600_000 - dias * 86_400_000).toISOString().slice(0, 10)
  const [evento] = await sql<{ id: string }[]>`select id from events where slug = ${SLUG}`
  await sql`delete from planner_tasks where event_id = ${evento!.id}`
  await sql`insert into planner_tasks (event_id, stage, title, due_date) values (${evento!.id}, 'propias', 'Elegir el menú', ${hace(2)}), (${evento!.id}, 'propias', 'Llamar al DJ', ${hace(5)})`
  const tarea = async (titulo: string) => (await sql<{ done_at: Date | null; due_date: string }[]>`select done_at, due_date::text from planner_tasks where event_id = ${evento!.id} and title = ${titulo}`)[0]!

  await page.goto(`/panel/eventos/${SLUG}/planner/agenda`)
  const atrasado = page.locator('section', { has: page.getByRole('heading', { name: 'Atrasado · 2' }) })
  await expect(atrasado).toContainText('Llamar al DJ')
  await expect(atrasado.getByText('Atrasado', { exact: true }).filter({ visible: true })).toHaveCount(2)

  // «Hecha» sin salir de la agenda, y «Deshacer» la devuelve.
  await atrasado.getByRole('button', { name: 'Marcar hecha «Elegir el menú»' }).click()
  await expect(page.getByRole('status')).toContainText('«Elegir el menú» quedó hecha')
  expect((await tarea('Elegir el menú')).done_at).not.toBeNull()
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Atrasado · 1' }) })).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer «Elegir el menú»' }).click()
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Atrasado · 2' }) })).toBeVisible()
  expect((await tarea('Elegir el menú')).done_at).toBeNull()

  // «Cambiar fecha» la pasa a otro día y deja de estar atrasada.
  const nuevo = hace(-3)
  await page.getByRole('link', { name: 'Cambiar la fecha de «Llamar al DJ»' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Cambiar fecha' })
  await elegirFecha(page, 'Nuevo día', nuevo)
  await dialogo.getByRole('button', { name: 'Cambiar fecha' }).click()
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  expect((await tarea('Llamar al DJ')).due_date).toBe(nuevo)
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Atrasado · 1' }) })).toBeVisible()

  // La leyenda es el filtro: ocultar las tareas las quita de la lista del mes.
  // (La lista del mes en curso empieza hoy: lo de antes está arriba, en «Atrasado».)
  await page.goto(`/panel/eventos/${SLUG}/planner/agenda?vista=lista&mes=${nuevo.slice(0, 7)}`)
  const mes = page.locator('section', { has: page.getByRole('navigation', { name: 'Qué se ve en la agenda' }) })
  await expect(mes).toContainText('Llamar al DJ')
  await expect(mes).not.toContainText('Elegir el menú')
  await page.getByRole('link', { name: 'Ocultar tareas' }).click()
  await expect(page.getByRole('link', { name: 'Mostrar tareas' })).toBeVisible()
  await expect(mes.getByText('Llamar al DJ')).toHaveCount(0)
})
