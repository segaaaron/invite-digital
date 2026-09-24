import { expect, type Page } from '@playwright/test'
import { ATELIER } from '../fixtures/atelier'
import { escribirInvitacion } from '../fixtures/invitacion-minima'

/**
 * Inicia sesión por el formulario. Solo para las pruebas que necesitan una sesión
 * propia: el resto reutiliza la cookie que guarda `auth.setup.ts`, porque el limitador
 * de intentos es de tres por minuto y por cuenta.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(ATELIER.email)
  await page.getByLabel('Contraseña').fill(ATELIER.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  // Entrar cae en el resumen del evento activo; sin ningún evento, en la bandeja.
  await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+|\/admin)?$/)
}

type EventInput = {
  slug: string
  title: string
  eventDate?: string
  rsvpDeadline?: string
  /** El nombre del diseño a elegir al crearlo («Botánica»). Después ya no se cambia. */
  diseno?: string
}

/** Crea un evento por el formulario del panel y espera su confirmación. */
export async function createEvent(page: Page, input: EventInput): Promise<void> {
  await page.goto('/panel/eventos/nuevo')
  await page.getByLabel('Título').fill(input.title)
  await page.getByLabel('Enlace del evento').fill(input.slug)
  // Calendario propio, no un `<input type=date>`: se elige como lo haría el atelier.
  await elegirFecha(page, 'Fecha del evento', input.eventDate ?? '2027-05-15')
  await elegirFecha(page, 'Fecha límite de confirmación', input.rsvpDeadline ?? '2027-05-01')
  if (input.diseno !== undefined) await page.getByRole('radio', { name: new RegExp(input.diseno) }).check({ force: true })
  await page.getByRole('button', { name: 'Crear evento' }).click()
  await expect(page.getByRole('status')).toContainText('Evento guardado')
  // Sin quién, cuándo y dónde el panel no deja invitar: es lo que haría el atelier primero.
  await escribirInvitacion(input.slug)
}

/** Crea un grupo. El enlace no se enseña al crear: se prepara desde «Enviar invitaciones». */
export async function createGuestGroup(
  page: Page,
  eventSlug: string,
  label: string,
  seats: number,
): Promise<void> {
  // El alta es el diálogo de la maqueta. Un grupo se crea dando de alta a su primera
  // persona —«Invitación propia», que es lo que viene puesto— con tantos acompañantes como
  // cupos de más; la invitación se llama como ella.
  await escribirInvitacion(eventSlug)
  await page.goto(`/panel/eventos/${eventSlug}/invitados?panel=alta`)
  await page.getByLabel('Nombre completo').fill(label)
  // «Acompañado» abre un campo por acompañante, y de cada uno solo se pide el nombre: los
  // cupos del grupo son la persona más ellos.
  await añadirAcompanantes(page, Math.max(0, seats - 1))
  await page.getByRole('button', { name: 'Guardar' }).click()
  // Guardar cierra el diálogo.
  await page.waitForURL(/invitados$/)
}

/**
 * Despliega una invitación de varias personas en la lista de Invitados: nace **plegada** —se lee
 * como una línea: nombre, cuántos son, si se envió— y sus personas no están en el DOM hasta
 * tocarla. Sin esto, «Editar a …» de un acompañante no existe para Playwright.
 *
 * No hace nada si esa invitación es de una sola persona, que va en su fila de siempre.
 */
export async function desplegarInvitacion(page: Page, label: string): Promise<void> {
  const cabecera = page.getByRole('button', { expanded: false }).filter({ hasText: label })
  if ((await cabecera.count()) > 0) await cabecera.first().click()
}

/** Abre «Acompañado» y escribe un nombre por acompañante, que es lo único que se les pide. */
export async function añadirAcompanantes(page: Page, cuantos: number): Promise<void> {
  if (cuantos === 0) return
  await page.getByLabel('Tipo de invitación').selectOption('acompanado')
  for (let i = 1; i < cuantos; i += 1) await page.getByRole('button', { name: 'Añadir acompañante' }).click()
  for (let i = 0; i < cuantos; i += 1) {
    await page.getByLabel(`Nombre del acompañante ${i + 1}`).fill(`Acompañante ${i + 1}`)
  }
}

/**
 * Abre la tarjeta de una sección de «Mi invitación» y devuelve su formulario. Las secciones
 * se pliegan de una en una: pulsar una ya abierta la cerraría, así que solo se pulsa si está
 * cerrada.
 */
export async function abrirSeccion(page: Page, titulo: string) {
  const boton = page.getByRole('button', { name: titulo, exact: true })
  if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click()
  return page.locator('form', { has: boton })
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * Elige un día en el calendario del panel (`SelectorDeFecha`), como lo haría alguien: abre el
 * campo por su rótulo, pasa meses hasta el buscado y pulsa el día. `iso` es `YYYY-MM-DD`.
 */
export async function elegirFecha(page: Page, rotulo: string, iso: string): Promise<void> {
  await page.getByLabel(rotulo, { exact: true }).click()
  const calendario = page.getByRole('dialog', { name: 'Elegir fecha' })
  const [anio, mes, dia] = iso.split('-').map(Number) as [number, number, number]
  const buscado = `${MESES[mes - 1]} de ${anio}`
  for (let i = 0; i < 48; i++) {
    const titulo = (await calendario.locator('p[aria-live]').textContent())?.trim().toLowerCase() ?? ''
    if (titulo === buscado) break
    const [mesActual = '', , anioActual = '0'] = titulo.split(' ')
    const adelante = Number(anioActual) * 12 + MESES.indexOf(mesActual) < anio * 12 + (mes - 1)
    await calendario.getByRole('button', { name: adelante ? 'Mes siguiente' : 'Mes anterior' }).click()
  }
  await calendario.getByRole('button', { name: new RegExp(`, ${dia} de ${MESES[mes - 1]} de ${anio}$`) }).click()
}
