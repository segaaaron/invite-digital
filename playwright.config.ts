import { defineConfig, devices } from '@playwright/test'

// Puerto propio, no el 3000: en esta máquina conviven servidores de otros proyectos y
// `reuseExistingServer` acabaría probando la aplicación equivocada.
const PORT = process.env.E2E_PORT ?? '3100'
const BASE_URL = `http://localhost:${PORT}`

/**
 * `E2E_DEV=1` corre contra `next dev` en vez de contra la imagen.
 *
 * Es para iterar: un `pnpm build` son dos minutos, y comprobar que un botón se ve no los
 * vale. **No sirve para todo**: en desarrollo Serwist va apagado, así que el modo puerta
 * sin red no existe ahí; esas dos suites se saltan y el aviso lo dice. Antes de cerrar,
 * la pasada de verdad va sin esta variable.
 */
const CONTRA_DEV = process.env.E2E_DEV === '1'
if (CONTRA_DEV) {
  console.warn('E2E_DEV=1 · contra `next dev`, sin Service Worker: se saltan checkin y puerta.')
}

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: CONTRA_DEV ? [/checkin\.spec\.ts/, /puerta\.spec\.ts/] : [],
  fullyParallel: false,
  // Las suites comparten base y `slug`s fijos, así que el reparto por defecto es de uno.
  // `E2E_WORKERS=4 pnpm test:e2e modelos.spec.ts` va en paralelo para las que no tocan la
  // base —el escaparate arma su propio evento de muestra— y baja de un minuto a quince
  // segundos.
  workers: Number(process.env.E2E_WORKERS ?? 1),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
    command: CONTRA_DEV
      ? `NEXT_DIST_DIR=.next-e2e pnpm dev --port ${PORT}`
      : process.env.CI
        ? `pnpm build && pnpm start --port ${PORT}`
        : `pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite',
      // La aplicación construye URLs absolutas con SITE_URL: debe apuntar a este puerto.
      SITE_URL: BASE_URL,
      // La suya, para no pelearse con el `pnpm dev` que ya esté abierto.
      ...(CONTRA_DEV ? { NEXT_DIST_DIR: '.next-e2e' } : {}),
    },
  },
})
