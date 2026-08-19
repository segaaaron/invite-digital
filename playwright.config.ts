import { defineConfig, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // In CI there is no prior build and no inherited env, so the server would fail to
    // import src/shared/config/env.ts. Locally an already-running server is reused.
    command: process.env.CI ? 'pnpm build && pnpm start' : 'pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://invite:invite@localhost:5434/invite',
      SITE_URL: process.env.SITE_URL ?? BASE_URL,
    },
  },
})
