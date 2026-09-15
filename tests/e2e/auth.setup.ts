import { expect, test as setup } from '@playwright/test'
import postgres from 'postgres'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { ADMIN, ADMIN_AUTH_STATE, ATELIER, AUTH_STATE } from './fixtures/atelier'

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite', { max: 1 })

async function entrar(page: import('@playwright/test').Page, quien: { email: string; password: string }, destino: string) {
  await page.goto('/panel/entrar')
  await page.getByLabel('Correo').fill(quien.email)
  await page.getByLabel('Contraseña').fill(quien.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  // Entrar cae en el resumen del evento activo; sin ningún evento, en la bandeja.
  await expect(page).toHaveURL(/\/panel(\/eventos\/[a-z0-9-]+|\/admin)?$/)

  await page.context().storageState({ path: destino })
}

/**
 * Inicia sesión una sola vez por ejecución y guarda la cookie. Repetirlo por prueba
 * chocaría con el limitador de intentos por cuenta —tres por minuto—, que es
 * exactamente lo que debe hacer.
 */
setup('sesión del atelier', async ({ page }) => {
  await entrar(page, ATELIER, AUTH_STATE)
})

/**
 * Y la del administrador, con **su propio usuario**, sembrado aquí.
 *
 * La suite no puede depender de qué rol tenga `atelier@` en la base de desarrollo: eso
 * ata las pruebas a un dato que se cambia desde el propio panel.
 */
setup('sesión del administrador', async ({ page }) => {
  // `must_change_password` **explícito**: la columna nace en `true` —la contraseña de una
  // cuenta nueva la escribe el admin y viaja por correo—, pero esta la pone el fixture y
  // no ha viajado a ninguna parte. Sin esto, el propio setup aterriza en la pantalla de
  // cambiar contraseña y **ninguna suite llega a correr**.
  await sql`
    insert into users (email, password_hash, role, must_change_password)
    values (${ADMIN.email}, ${await argon2Hasher.hash(ADMIN.password)}, 'admin', false)
    on conflict (email) do update set role = 'admin', must_change_password = false
  `
  await sql.end({ timeout: 5 })

  await entrar(page, ADMIN, ADMIN_AUTH_STATE)
})
