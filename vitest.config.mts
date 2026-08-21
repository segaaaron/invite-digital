import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Extensión .mts: el fichero usa sintaxis ESM y, como .ts, Vite lo cargaba como
// CommonJS y avisaba en cada corrida. Poner "type": "module" en package.json lo
// arreglaría igual, pero alcanzaría a Next, PostCSS y drizzle-kit a la vez.
export default defineConfig({
  // Los alias de tsconfig los resuelve Vite de forma nativa; `vite-tsconfig-paths`
  // sobraba.
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
})
