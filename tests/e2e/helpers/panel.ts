import { expect, type Page } from '@playwright/test'
import { ATELIER } from '../fixtures/atelier'

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
  await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+)?$/)
}

type EventInput = {
  slug: string
  title: string
  eventDate?: string
  rsvpDeadline?: string
}

/** Crea un evento por el formulario del panel y espera su confirmación. */
export async function createEvent(page: Page, input: EventInput): Promise<void> {
  await page.goto('/panel/eventos/nuevo')
  await page.getByLabel('Título').fill(input.title)
  await page.getByLabel('Identificador').fill(input.slug)
  await page.getByLabel('Fecha del evento').fill(input.eventDate ?? '2027-05-15')
  await page.getByLabel('Fecha límite de confirmación').fill(input.rsvpDeadline ?? '2027-05-01')
  await page.getByRole('button', { name: 'Crear evento' }).click()
  await expect(page.getByRole('status')).toContainText('Evento guardado')
}

/** Crea un grupo y devuelve el enlace de invitación, que solo se muestra una vez. */
export async function createGuestGroup(
  page: Page,
  eventSlug: string,
  label: string,
  seats: number,
): Promise<string> {
  // El alta es el diálogo de la maqueta. Un grupo se crea dando de alta a su primera
  // persona con «Grupo nuevo…» y tantos acompañantes como cupos de más.
  await page.goto(`/panel/eventos/${eventSlug}/invitados?panel=alta`)
  await page.getByLabel('Nombre completo').fill(label)
  await page.getByLabel('Grupo', { exact: true }).selectOption('')
  await page.getByLabel('Nombre del grupo nuevo').fill(label)
  await page.getByLabel('Acompañantes').fill(String(Math.max(0, seats - 1)))
  await page.getByRole('button', { name: 'Guardar' }).click()
  const enlace = await page.getByLabel('Enlace de la invitación').inputValue()
  // El diálogo se queda abierto para copiar el enlace: cerrarlo deja la página usable.
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await page.waitForURL(/invitados$/)
  return enlace
}
