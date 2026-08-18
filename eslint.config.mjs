import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import boundaries from 'eslint-plugin-boundaries'

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
        { type: 'app', pattern: 'src/app/**' },
        { type: 'sections', pattern: 'src/sections/**' },
        { type: 'three', pattern: 'src/three/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [2, {
        default: 'disallow',
        rules: [
          { from: 'domain', allow: ['domain', 'shared'] },
          { from: 'application', allow: ['domain', 'application', 'shared'] },
          { from: 'infrastructure', allow: ['domain', 'application', 'infrastructure', 'shared'] },
          { from: 'ui', allow: ['domain', 'application', 'ui', 'shared', 'three'] },
          { from: 'sections', allow: ['ui', 'application', 'domain', 'shared', 'three'] },
          { from: 'app', allow: ['ui', 'application', 'domain', 'shared', 'sections', 'three', 'infrastructure'] },
          { from: 'three', allow: ['shared', 'three'] },
          { from: 'shared', allow: ['shared'] },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
