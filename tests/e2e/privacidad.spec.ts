import { expect, test } from '@playwright/test'
import { AUTH_STATE } from './fixtures/atelier'
import { closePrivateDb, deletePrivateEvent, seedPrivateEvent } from './fixtures/privacidad'

const SLUG = 'boda-privada-e2e'

test.afterAll(async () => {
  await deletePrivateEvent(SLUG)
  await closePrivateDb()
})

test('con contraseña, la invitación no enseña nada hasta escribirla', async ({ browser }) => {
  const { token } = await seedPrivateEvent(SLUG)

  // 1. El atelier la protege.
  const atelier = await browser.newContext({ storageState: AUTH_STATE })
  const panel = await atelier.newPage()
  await panel.goto(`/panel/eventos/${SLUG}/configuracion`)
  await panel.getByRole('radio', { name: /protegida con contraseña/i }).check()
  await panel.getByLabel(/contraseña de acceso/i).fill('lasflores2027')
  await panel.getByRole('button', { name: 'Guardar privacidad' }).click()
  await expect(panel.getByRole('status')).toContainText('Privacidad guardada')

  // 2. El invitado con el enlace no ve ni el título del evento.
  const invitado = await (await browser.newContext()).newPage()
  await invitado.goto(`/i/${token}`)
  await expect(invitado.getByRole('heading', { name: 'Escribe la contraseña' })).toBeVisible()
  await expect(invitado.getByText(`Boda ${SLUG}`)).toHaveCount(0)

  // 3. Una contraseña equivocada no dice si el enlace era bueno.
  await invitado.getByLabel('Contraseña').fill('otra-cosa')
  await invitado.getByRole('button', { name: 'Entrar' }).click()
  // El anunciador de rutas de Next también es role=alert: filtramos por el texto.
  await expect(invitado.getByRole('alert').filter({ hasText: 'No pudimos abrir' })).toBeVisible()

  // 4. La buena abre la invitación.
  await invitado.getByLabel('Contraseña').fill('lasflores2027')
  await invitado.getByRole('button', { name: 'Entrar' }).click()
  await expect(invitado.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(invitado.getByRole('heading', { name: 'Escribe la contraseña' })).toHaveCount(0)
})
