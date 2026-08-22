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
  await expect(page).toHaveURL(/\/panel$/)
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
  await page.goto(`/panel/eventos/${eventSlug}/invitados`)
  await page.getByLabel('Grupo invitado').fill(label)
  await page.getByLabel('Cupos').fill(String(seats))
  await page.getByRole('button', { name: 'Crear invitación' }).click()
  return page.getByLabel('Enlace de la invitación').inputValue()
}
