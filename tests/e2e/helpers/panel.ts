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
  await page.getByLabel('Fecha del evento').fill(input.eventDate ?? '2027-05-15')
  await page.getByLabel('Fecha límite de confirmación').fill(input.rsvpDeadline ?? '2027-05-01')
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

/** Abre «Acompañado» y escribe un nombre por acompañante, que es lo único que se les pide. */
export async function añadirAcompanantes(page: Page, cuantos: number): Promise<void> {
  if (cuantos === 0) return
  await page.getByLabel('Tipo de invitación').selectOption('acompanado')
  for (let i = 1; i < cuantos; i += 1) await page.getByRole('button', { name: 'Añadir acompañante' }).click()
  for (let i = 0; i < cuantos; i += 1) {
    await page.getByLabel(`Nombre del acompañante ${i + 1}`).fill(`Acompañante ${i + 1}`)
  }
}
