import { defineConfig, devices } from '@playwright/test'

// Puerto propio, no el 3000: en esta máquina conviven servidores de otros proyectos y
// `reuseExistingServer` acabaría probando la aplicación equivocada.
const PORT = process.env.E2E_PORT ?? '3100'
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [
    // Inicia sesión una vez y guarda la cookie para las pruebas del panel.
    // `teardown` borra el administrador de pruebas al terminar: la suite lo necesita
    // mientras corre, pero un usuario con todos los permisos que sobrevive a la
    // ejecución es una puerta abierta con la contraseña escrita en el repositorio.
    { name: 'setup', testMatch: /auth\.setup\.ts/, teardown: 'cleanup' },
    { name: 'cleanup', testMatch: /auth\.teardown\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: {
    // In CI there is no prior build and no inherited env, so the server would fail to
    // import src/shared/config/env.ts. Locally an already-running server is reused.
    command: process.env.CI ? `pnpm build && pnpm start --port ${PORT}` : `pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite',
      // La aplicación construye URLs absolutas con SITE_URL: debe apuntar a este puerto.
      SITE_URL: BASE_URL,
    },
  },
})
