import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import boundaries from 'eslint-plugin-boundaries'

/**
 * Política de fronteras entre módulos. `boundaries/dependencies` es la regla real de la
 * versión 7; `boundaries/element-types` sobrevive como alias heredado y emitía cuatro
 * avisos de deprecación en cada `pnpm lint`.
 *
 * Que la política exista no prueba que corte nada. Se comprobó a mano, con la regla
 * antigua y con esta: un `import` de `infrastructure` desde `domain` da error, y los
 * caminos permitidos siguen pasando. Si alguien toca esto, que repita la prueba.
 */
const permitido = (desde, hacia) => ({
  from: { element: { type: desde } },
  allow: { to: { element: { types: { anyOf: hacia } } } },
})

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/modules/*/domain/**' },
        { type: 'application', pattern: 'src/modules/*/application/**' },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure/**' },
        { type: 'ui', pattern: 'src/modules/*/ui/**' },
        { type: 'shared', pattern: 'src/shared/**' },
        // Las Server Actions: puntos de entrada, como las páginas. Van antes que `app` porque
        // gana el primer patrón que casa.
        { type: 'acciones', pattern: 'src/app/_acciones/**' },
        { type: 'app', pattern: 'src/app/**' },
        { type: 'sections', pattern: 'src/sections/**' },
        { type: 'three', pattern: 'src/three/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          policies: [
            // `domain` es puro: ni base de datos, ni red, ni framework.
            permitido('domain', ['domain', 'shared']),
            // `application` orquesta el dominio, pero nunca conoce `infrastructure`.
            permitido('application', ['domain', 'application', 'shared']),
            permitido('infrastructure', ['domain', 'application', 'infrastructure', 'shared']),
            // La UI llama a las Server Actions (una referencia que Next convierte en petición), pero
            // no a la composición: `acciones` sí, `app` no.
            permitido('ui', ['domain', 'application', 'ui', 'shared', 'three', 'acciones']),
            // Las acciones son frontera: resuelven dependencias en la composición y hablan con los
            // casos de uso. Ningún módulo importa `acciones` salvo su UI.
            permitido('acciones', ['acciones', 'app', 'ui', 'application', 'domain', 'infrastructure', 'shared']),
            permitido('sections', ['ui', 'application', 'domain', 'shared', 'three']),
            // Solo la capa de composición ve `infrastructure`: es donde se inyectan las
            // dependencias reales.
            permitido('app', ['ui', 'application', 'domain', 'shared', 'sections', 'three', 'infrastructure', 'acciones']),
            permitido('three', ['shared', 'three']),
            permitido('shared', ['shared']),
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  // `public/` son recursos estáticos que el servidor sirve tal cual, no código
  // fuente del proyecto: no pasan por el compilador ni por las fronteras.
  //
  // `docs/` es documentación, y desde que la maqueta del panel se mudó a
  // `docs/design-reference/dashboard/` incluye un `.js` que no se escribe aquí:
  // trae su propio estilo y ensuciaba la puerta con once avisos de un archivo que
  // nadie va a tocar. Esto NO relaja ninguna frontera: `docs/` no se compila ni se
  // sirve, y `src/**` sigue lintándose entero.
  globalIgnores(['.next/**', '.next-e2e/**', '.shots/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**', 'docs/**']),
])
