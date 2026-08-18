# InvitePremium — Plan A: sitio público

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar la landing de lujo de InvitePremium en español e inglés, con catálogo servido desde Postgres, hero 3D y captura de leads hacia WhatsApp, desplegable en el VPS.

**Architecture:** Monolito modular en Next.js 16 App Router. Cada módulo (`catalog`, `leads`) es una rebanada vertical con capas `domain` → `application` → `infrastructure` → `ui`, con fronteras verificadas por ESLint. El dominio es puro y devuelve `Result<T, E>`; los repositorios Drizzle implementan puertos declarados en `application`. La UI consume casos de uso a través de una raíz de composición única.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, Drizzle ORM + postgres.js, Postgres 17, Zod, Framer Motion, React Three Fiber, Vitest, Playwright, Docker Compose, Caddy.

**Spec:** `docs/superpowers/specs/2026-08-17-marketing-site-design.md`

## Global Constraints

- Node 22, pnpm 11. Gestor de paquetes: **pnpm** exclusivamente.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Prohibido `any` y `@ts-ignore`.
- Idiomas: `en` (fallback) y `es`. Sin selector visible de idioma en la UI.
- Moneda: BOB, almacenada en centavos enteros. Formato visible: `Bs 690`.
- Tokens de color obligatorios (ningún literal hexadecimal en componentes):
  `--iv-bg #f6f1e9`, `--iv-bg-raised #fdfaf4`, `--iv-bg-sunken #efe7dc`,
  `--iv-ink #2b2723`, `--iv-ink-soft #58514a`, `--iv-ink-mute #9a917f`,
  `--iv-gold #c19b4a`, `--iv-gold-deep #a8823a`, `--iv-gold-light #e2c584`.
- Tipografías: Cormorant Garamond (display) y Jost (UI), servidas localmente con `next/font/local`. Prohibido cargar fuentes desde Google en producción.
- Presupuesto de rendimiento: LCP < 2.0 s, CLS < 0.05, INP < 200 ms.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- Fuente visual de la verdad: `/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/InvitePremium Ivory.dc.html` (referida como **IVORY** en adelante).
- Datos pendientes del cliente, usar estas constantes de marcador en `src/shared/config/brand.ts` y no dispersarlas: WhatsApp `+59170012345`, email `atelier@invitepremium.bo`, dominio `https://invitepremium.bo`.
- Cada tarea termina con commit. Mensajes en formato Conventional Commits.

---

## Estructura de archivos

```
src/
  app/
    layout.tsx                      html raíz, fuentes, tokens
    [locale]/layout.tsx             provee locale + diccionario
    [locale]/page.tsx               landing
    [locale]/colecciones/page.tsx   catálogo
    sitemap.ts robots.ts
  middleware.ts                     negociación y redirección de idioma
  shared/
    result/index.ts                 Result, ok, err
    config/env.ts brand.ts
    i18n/locales.ts negotiate.ts dictionaries.ts format.ts
    design/tokens.css fonts.ts ui/*.tsx motion/*.ts
    db/client.ts schema.ts seed.ts
    composition/container.ts        raíz de composición
  modules/
    catalog/
      domain/money.ts plan.ts template.ts errors.ts
      application/ports.ts list-plans.ts list-templates.ts get-template.ts
      infrastructure/drizzle-plan-repository.ts drizzle-template-repository.ts mappers.ts
      ui/PlanCard.tsx TemplateCard.tsx PricingSection.tsx ModelsSection.tsx CollectionsCarousel.tsx
      index.ts
    leads/
      domain/consultation.ts errors.ts
      application/ports.ts submit-consultation.ts
      infrastructure/drizzle-consultation-repository.ts whatsapp-link.ts
      ui/ConsultationForm.tsx ContactSection.tsx
      index.ts
  sections/                         secciones de landing sin lógica de módulo
    HeroSection.tsx ExperienceSection.tsx MobileSection.tsx
    ComparisonSection.tsx TestimonialsSection.tsx FaqSection.tsx SiteHeader.tsx SiteFooter.tsx
  three/
    EnvelopeScene.tsx EnvelopeModel.tsx HeroCanvas.tsx
tests/
  e2e/*.spec.ts
db/migrations/
docker/
  Dockerfile Caddyfile compose.yml compose.dev.yml backup.sh
```

Regla de tamaño: ningún archivo supera 250 líneas. Si una sección crece más, se parte en subcomponentes dentro de su carpeta.

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/shared/result/index.ts`
- Test: `src/shared/result/result.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `Result<T, E>`, `ok<T>(value: T): Result<T, never>`, `err<E>(error: E): Result<never, E>`, `isOk<T, E>(r: Result<T, E>): r is { ok: true; value: T }`, `unwrapOr<T, E>(r: Result<T, E>, fallback: T): T`. Comando de pruebas `pnpm test`.

- [ ] **Step 1: Crear el proyecto Next**

```bash
cd /Users/miguelangelsaraviabelmonte/dev-web/luxurypremiuminvite-web
pnpm dlx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --no-turbopack --use-pnpm
```

Si el asistente pregunta por sobrescribir archivos existentes, conservar `docs/` y `.gitignore`.

- [ ] **Step 2: Endurecer TypeScript**

En `tsconfig.json`, dentro de `compilerOptions`:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true,
  "verbatimModuleSyntax": true
}
```

- [ ] **Step 3: Instalar dependencias del ciclo**

```bash
pnpm add drizzle-orm postgres zod framer-motion
pnpm add -D drizzle-kit vitest @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/jest-dom jsdom eslint-plugin-boundaries
```

- [ ] **Step 4: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
  },
})
```

En `package.json`, añadir a `scripts`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 5: Escribir la prueba que falla de `Result`**

Crear `src/shared/result/result.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { err, isOk, ok, unwrapOr } from './index'

describe('Result', () => {
  it('envuelve un valor exitoso', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    expect(unwrapOr(r, 0)).toBe(42)
  })

  it('envuelve un error y devuelve el respaldo', () => {
    const r = err({ kind: 'not_found' as const })
    expect(isOk(r)).toBe(false)
    expect(unwrapOr(r, 7)).toBe(7)
  })

  it('estrecha el tipo cuando isOk es verdadero', () => {
    const r: ReturnType<typeof ok<string>> | ReturnType<typeof err<'boom'>> = ok('hola')
    if (isOk(r)) {
      expect(r.value.toUpperCase()).toBe('HOLA')
    }
  })
})
```

- [ ] **Step 6: Ejecutar la prueba y verificar que falla**

Run: `pnpm test src/shared/result/result.test.ts`
Expected: FAIL — `Failed to resolve import "./index"`.

- [ ] **Step 7: Implementar `Result`**

Crear `src/shared/result/index.ts`:

```ts
export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E> = { readonly ok: false; readonly error: E }
export type Result<T, E> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E>(error: E): Err<E> => ({ ok: false, error })

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.ok ? result.value : fallback

export const mapResult = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result
```

- [ ] **Step 8: Ejecutar la prueba y verificar que pasa**

Run: `pnpm test src/shared/result/result.test.ts`
Expected: PASS, 3 pruebas.

- [ ] **Step 9: Configurar fronteras de ESLint**

Reemplazar `eslint.config.mjs`:

```js
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import boundaries from 'eslint-plugin-boundaries'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
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
]
```

- [ ] **Step 10: Verificar que compila y pasa lint**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: los tres en verde.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: andamiaje Next 15 con TS strict, Vitest y fronteras de módulos"
```

---

### Task 2: Configuración de entorno y constantes de marca

**Files:**
- Create: `src/shared/config/env.ts`, `src/shared/config/brand.ts`, `.env.example`
- Test: `src/shared/config/env.test.ts`

**Interfaces:**
- Consumes: `Result` de Task 1.
- Produces: `parseEnv(source: Record<string, string | undefined>): Env`, tipo `Env = { DATABASE_URL: string; SITE_URL: string; NODE_ENV: 'development' | 'test' | 'production' }`, objeto `env` ya validado, y `BRAND = { whatsapp: string; whatsappDisplay: string; email: string; city: string; siteName: string }`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/shared/config/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const valid = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/invite',
  SITE_URL: 'https://invitepremium.bo',
  NODE_ENV: 'production',
}

describe('parseEnv', () => {
  it('acepta un entorno válido', () => {
    expect(parseEnv(valid).SITE_URL).toBe('https://invitepremium.bo')
  })

  it('lanza cuando falta DATABASE_URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
  })

  it('lanza cuando SITE_URL no es una URL', () => {
    expect(() => parseEnv({ ...valid, SITE_URL: 'no-es-url' })).toThrow(/SITE_URL/)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test src/shared/config/env.test.ts`
Expected: FAIL — no existe `./env`.

- [ ] **Step 3: Implementar**

Crear `src/shared/config/env.ts`:

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  SITE_URL: z.string().url('SITE_URL debe ser una URL absoluta'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Configuración de entorno inválida — ${detail}`)
  }
  return parsed.data
}

export const env: Env = parseEnv(process.env)
```

Crear `src/shared/config/brand.ts`:

```ts
export const BRAND = {
  siteName: 'InvitePremium',
  tagline: 'LUXE · Atelier digital',
  whatsapp: '+59170012345',
  whatsappDisplay: '+591 700 12345',
  email: 'atelier@invitepremium.bo',
  city: 'Cochabamba, Bolivia',
} as const
```

Crear `.env.example`:

```
DATABASE_URL=postgres://invite:invite@localhost:5432/invite
SITE_URL=http://localhost:3000
NODE_ENV=development
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test src/shared/config/env.test.ts`
Expected: PASS, 3 pruebas.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: configuración de entorno validada con Zod y constantes de marca"
```

---

### Task 3: Negociación de idioma y diccionarios

**Files:**
- Create: `src/shared/i18n/locales.ts`, `src/shared/i18n/negotiate.ts`, `src/shared/i18n/dictionaries.ts`, `src/shared/i18n/format.ts`, `src/shared/i18n/messages/es.ts`, `src/shared/i18n/messages/en.ts`, `src/middleware.ts`
- Test: `src/shared/i18n/negotiate.test.ts`, `src/shared/i18n/format.test.ts`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces: `LOCALES = ['en', 'es']`, tipo `Locale`, `DEFAULT_LOCALE = 'en'`, `isLocale(value: string): value is Locale`, `negotiateLocale(input: { cookie?: string | null; acceptLanguage?: string | null }): Locale`, `getDictionary(locale: Locale): Dictionary`, `formatEventDate(date: Date, locale: Locale): string`.

- [ ] **Step 1: Escribir la prueba que falla de negociación**

Crear `src/shared/i18n/negotiate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { negotiateLocale } from './negotiate'

describe('negotiateLocale', () => {
  it('prefiere la cookie sobre la cabecera', () => {
    expect(negotiateLocale({ cookie: 'es', acceptLanguage: 'en-US,en;q=0.9' })).toBe('es')
  })

  it('ignora una cookie con valor no soportado', () => {
    expect(negotiateLocale({ cookie: 'fr', acceptLanguage: 'es-BO,es;q=0.9' })).toBe('es')
  })

  it('toma el idioma de mayor calidad de la cabecera', () => {
    expect(negotiateLocale({ acceptLanguage: 'fr;q=0.9,es;q=0.8,en;q=0.7' })).toBe('es')
  })

  it('reconoce variantes regionales', () => {
    expect(negotiateLocale({ acceptLanguage: 'es-419' })).toBe('es')
  })

  it('cae a inglés sin cabecera ni cookie', () => {
    expect(negotiateLocale({})).toBe('en')
  })

  it('cae a inglés cuando ningún idioma coincide', () => {
    expect(negotiateLocale({ acceptLanguage: 'de-DE,de;q=0.9' })).toBe('en')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test src/shared/i18n/negotiate.test.ts`
Expected: FAIL — no existe `./negotiate`.

- [ ] **Step 3: Implementar locales y negociación**

Crear `src/shared/i18n/locales.ts`:

```ts
export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value)
```

Crear `src/shared/i18n/negotiate.ts`:

```ts
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

type NegotiationInput = { cookie?: string | null; acceptLanguage?: string | null }

type Preference = { tag: string; quality: number }

function parseAcceptLanguage(header: string): Preference[] {
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality }
    })
    .filter((p) => p.tag.length > 0)
    .sort((a, b) => b.quality - a.quality)
}

export function negotiateLocale({ cookie, acceptLanguage }: NegotiationInput): Locale {
  if (cookie && isLocale(cookie)) return cookie
  if (!acceptLanguage) return DEFAULT_LOCALE

  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    const base = tag.split('-')[0] ?? ''
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test src/shared/i18n/negotiate.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Escribir la prueba que falla de formato**

Crear `src/shared/i18n/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatEventDate } from './format'

describe('formatEventDate', () => {
  it('formatea en español boliviano', () => {
    expect(formatEventDate(new Date('2026-10-12T12:00:00Z'), 'es')).toBe('12 de octubre de 2026')
  })

  it('formatea en inglés', () => {
    expect(formatEventDate(new Date('2026-10-12T12:00:00Z'), 'en')).toBe('October 12, 2026')
  })
})
```

- [ ] **Step 6: Ejecutar y verificar que falla**

Run: `pnpm test src/shared/i18n/format.test.ts`
Expected: FAIL — no existe `./format`.

- [ ] **Step 7: Implementar formato**

Crear `src/shared/i18n/format.ts`:

```ts
import type { Locale } from './locales'

const INTL_LOCALE: Record<Locale, string> = { es: 'es-BO', en: 'en-US' }

export function formatEventDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

Run: `pnpm test src/shared/i18n/format.test.ts`
Expected: PASS, 2 pruebas.

- [ ] **Step 9: Crear los diccionarios**

Crear `src/shared/i18n/messages/es.ts` con el copy literal de IVORY. Extraer los textos ejecutando:

```bash
sed -n '68,780p' "/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/InvitePremium Ivory.dc.html" \
  | sed -e 's/<[^>]*>/\n/g' | grep -vE '^\s*$' | grep -vE '^\s*\{\{'
```

Estructura obligatoria del diccionario (las claves son idénticas en ambos idiomas):

```ts
export const es = {
  nav: { collections: 'Colecciones', experience: 'Experiencia 3D', pricing: 'Inversión', contact: 'Hablemos' },
  hero: {
    eyebrow: 'Lujo sereno · Atelier digital',
    titleLine1: 'INVITACIONES',
    titleLine2: 'DIGITALES DE',
    titleAccent: 'alta costura',
    body: 'Sobres que se abren en 3D, sellos de cera que se rompen al tacto y una escena inmersiva por cada evento. Diseñamos la pieza, la programamos y la entregamos con dominio propio en 72 horas.',
    ctaPrimary: 'Crear invitación',
    ctaSecondary: 'Ver demo interactiva',
    trustLabel: 'Organizadores que confían en nosotros',
  },
  stats: {
    events: 'Eventos entregados',
    delivery: 'Entrega promedio',
    rsvp: 'Confirmación RSVP',
    countries: 'Países alcanzados',
  },
  experience: {
    eyebrow: 'La experiencia',
    title: 'Tres actos de una misma pieza',
    acts: [
      { label: 'Acto I', title: 'Unboxing virtual', body: 'El sobre llega cerrado. El invitado desliza, el sello de cera cede y la tarjeta emerge con física real de papel.' },
      { label: 'Acto II', title: 'Detalles inmersivos', body: 'Foil dorado que reacciona a la luz del cursor, texturas de algodón, tipografía compuesta a mano para cada nombre.' },
      { label: 'Acto III', title: 'Demo interactiva en vivo', body: 'Galería en movimiento, mapa, cuenta regresiva y RSVP con confirmación instantánea al WhatsApp de los novios.' },
    ],
  },
  mobile: {
    eyebrow: 'En su bolsillo',
    title: 'Así llega a su teléfono',
    body: 'Un solo enlace por WhatsApp. Se abre a pantalla completa, sin apps ni descargas, y funciona igual en iPhone, Android y tablet.',
    bullets: ['Carga en menos de dos segundos', 'Código QR para la mesa de recepción', 'Botón de confirmación directo al chat'],
  },
  collections: { eyebrow: 'Colecciones', title: 'Una escena para cada celebración', hint: 'Arrástralo o usa las flechas' },
  comparison: {
    eyebrow: 'Comparativa',
    title: 'La diferencia LUXE',
    hint: 'Arrastra el sello para comparar',
    luxe: ['Sobre 3D con apertura animada y sello de cera', 'Dominio propio, sin marcas de terceros', 'RSVP con panel en vivo y recordatorios', 'Música, galería inmersiva y cuenta regresiva', 'Diseño compuesto a mano por el atelier'],
    traditional: ['Imagen estática enviada por chat', 'Plantilla con logo de la plataforma', 'Confirmaciones contadas a mano', 'Sin galería, sin música, sin mapa', 'Mismo diseño que otros mil eventos'],
  },
  pricing: { eyebrow: 'Inversión', title: 'Planes & precios', mostChosen: 'Más elegido' },
  models: { eyebrow: 'Modelos', title: 'Invitaciones a tu medida', subtitle: 'Ocho diseños base · con código QR, botón de apertura y confirmación en línea', qr: 'Código QR', open: 'Abrir', seeAll: 'Ver todos los modelos' },
  contact: {
    eyebrow: 'Atelier de lujo sereno',
    title: 'Comienza tu viaje',
    body: 'Cuéntanos la fecha y el lugar. En menos de 24 horas recibes una propuesta con boceto y demo navegable de tu invitación.',
    submit: 'Solicitar consulta',
    successTitle: 'Solicitud recibida',
    successBody: 'Te escribimos en menos de 24 horas con el boceto y la demo navegable.',
    again: 'Enviar otra',
    fields: { name: 'Nombre', contact: 'WhatsApp o email', category: 'Tipo de evento', date: 'Fecha del evento', message: 'Cuéntanos sobre tu evento' },
  },
  footer: { rights: 'Todos los derechos reservados', coverage: 'Cochabamba, Bolivia · Entregas a todo el país' },
} as const

export type Dictionary = typeof es
```

Crear `src/shared/i18n/messages/en.ts` con las mismas claves y tipo `Dictionary`, traducido con tono editorial de lujo (no literal). Ejemplo del bloque hero:

```ts
import type { Dictionary } from './es'

export const en: Dictionary = {
  nav: { collections: 'Collections', experience: '3D Experience', pricing: 'Investment', contact: "Let's talk" },
  hero: {
    eyebrow: 'Quiet luxury · Digital atelier',
    titleLine1: 'COUTURE',
    titleLine2: 'DIGITAL',
    titleAccent: 'invitations',
    body: 'Envelopes that open in 3D, wax seals that break at your touch, and an immersive scene for every celebration. We design the piece, build it, and deliver it on its own domain within 72 hours.',
    ctaPrimary: 'Create your invitation',
    ctaSecondary: 'See the live demo',
    trustLabel: 'Planners who trust us',
  },
  // …resto de claves, mismas rutas, mismo orden
}
```

El tipado `Dictionary` obliga a que ninguna clave falte: si sobra o falta una, `pnpm typecheck` falla.

Crear `src/shared/i18n/dictionaries.ts`:

```ts
import { en } from './messages/en'
import { es, type Dictionary } from './messages/es'
import type { Locale } from './locales'

const DICTIONARIES: Record<Locale, Dictionary> = { en, es }

export const getDictionary = (locale: Locale): Dictionary => DICTIONARIES[locale]
export type { Dictionary }
```

- [ ] **Step 10: Implementar el middleware**

Crear `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES, LOCALE_COOKIE, isLocale } from '@/shared/i18n/locales'
import { negotiateLocale } from '@/shared/i18n/negotiate'

const PUBLIC_FILE = /\.[^/]+$/

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const segment = pathname.split('/')[1] ?? ''
  if (isLocale(segment)) return NextResponse.next()

  const locale = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: request.headers.get('accept-language'),
  })

  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  const response = NextResponse.redirect(url, 307)
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

`LOCALES` se importa para mantener una sola fuente de idiomas; si ESLint marca la importación como no usada, eliminarla del `import` y dejar solo `LOCALE_COOKIE` e `isLocale`.

- [ ] **Step 11: Verificar la suite completa**

Run: `pnpm test && pnpm typecheck`
Expected: todo en verde.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: i18n es/en con negociación automática, diccionarios tipados y middleware"
```

---

### Task 4: Sistema de diseño — tokens, fuentes y primitivas

**Files:**
- Create: `src/shared/design/tokens.css`, `src/shared/design/fonts.ts`, `src/shared/design/ui/Button.tsx`, `src/shared/design/ui/SectionHeading.tsx`, `src/shared/design/ui/GlassPanel.tsx`, `src/shared/design/motion/variants.ts`, `public/fonts/*`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Test: `src/shared/design/ui/Button.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `Button` (`variant: 'gold' | 'ghost'`, `href?: string`, `children`), `SectionHeading` (`eyebrow: string`, `title: ReactNode`, `align?: 'left' | 'center'`), `GlassPanel`, `fadeUp`/`stagger` (variantes de Framer Motion), y las clases utilitarias de token para Tailwind.

- [ ] **Step 1: Descargar las fuentes a local**

```bash
mkdir -p public/fonts
curl -sL "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@200;300;400;500&display=swap" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  | grep -oE "https://fonts.gstatic.com[^)]+\.woff2" | sort -u \
  | while read -r url; do curl -sL "$url" -o "public/fonts/$(basename "$url")"; done
ls public/fonts
```

Renombrar los archivos descargados a `cormorant-garamond-{300,400,500,600}.woff2` y `jost-{200,300,400,500}.woff2` según el peso que corresponda (el orden del CSS de Google es ascendente por peso dentro de cada familia).

- [ ] **Step 2: Declarar las fuentes**

Crear `src/shared/design/fonts.ts`:

```ts
import localFont from 'next/font/local'

export const display = localFont({
  variable: '--font-display',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
})

export const sans = localFont({
  variable: '--font-sans',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/jost-200.woff2', weight: '200', style: 'normal' },
    { path: '../../../public/fonts/jost-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/jost-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/jost-500.woff2', weight: '500', style: 'normal' },
  ],
})
```

- [ ] **Step 3: Definir los tokens**

Crear `src/shared/design/tokens.css`:

```css
@theme {
  --color-bg: #f6f1e9;
  --color-bg-raised: #fdfaf4;
  --color-bg-sunken: #efe7dc;
  --color-ink: #2b2723;
  --color-ink-soft: #58514a;
  --color-ink-mute: #9a917f;
  --color-gold: #c19b4a;
  --color-gold-deep: #a8823a;
  --color-gold-light: #e2c584;
  --color-line: rgb(193 155 74 / 0.22);

  --font-display: var(--font-display), 'Cormorant Garamond', serif;
  --font-sans: var(--font-sans), system-ui, sans-serif;

  --radius-pill: 999px;
  --radius-card: 22px;

  --shadow-float: 0 22px 60px -28px rgb(90 66 26 / 0.45);
  --shadow-lift: 0 34px 90px -40px rgb(90 66 26 / 0.55);

  --tracking-luxe: 0.18em;
}

:root {
  --page-gradient: radial-gradient(1200px 700px at 78% -8%, #fffdf9 0%, #f6f1e9 46%, #efe7dc 100%);
}
```

Reemplazar el contenido de `src/app/globals.css`:

```css
@import 'tailwindcss';
@import '../shared/design/tokens.css';

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--page-gradient);
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-weight: 300;
  overflow-x: hidden;
}

::selection { background: rgb(193 155 74 / 0.24); color: #26221e; }
:focus-visible { outline: 1px solid var(--color-gold); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Escribir la prueba que falla de `Button`**

Crear `src/shared/design/ui/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza un botón cuando no hay href', () => {
    render(<Button>Crear invitación</Button>)
    expect(screen.getByRole('button', { name: 'Crear invitación' })).toBeDefined()
  })

  it('renderiza un enlace cuando hay href', () => {
    render(<Button href="/es/planes">Ver planes</Button>)
    const link = screen.getByRole('link', { name: 'Ver planes' })
    expect(link.getAttribute('href')).toBe('/es/planes')
  })

  it('marca los enlaces externos con rel seguro', () => {
    render(<Button href="https://wa.me/59170012345" external>Escribir</Button>)
    const link = screen.getByRole('link', { name: 'Escribir' })
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
```

- [ ] **Step 5: Ejecutar y verificar que falla**

Run: `pnpm test src/shared/design/ui/Button.test.tsx`
Expected: FAIL — no existe `./Button`.

- [ ] **Step 6: Implementar `Button`**

Crear `src/shared/design/ui/Button.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  external?: boolean
  variant?: 'gold' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] transition-transform duration-300 hover:-translate-y-0.5'

const VARIANTS = {
  gold: 'bg-gold text-bg-raised shadow-[var(--shadow-float)] hover:bg-gold-deep',
  ghost: 'border border-[var(--color-line)] bg-bg-raised/70 text-ink backdrop-blur-md hover:border-gold',
} as const

export function Button({ children, href, external, variant = 'gold', type = 'button', className = '' }: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`.trim()

  if (href) {
    if (external) {
      return (
        <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    }
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type={type}>
      {children}
    </button>
  )
}
```

- [ ] **Step 7: Ejecutar y verificar que pasa**

Run: `pnpm test src/shared/design/ui/Button.test.tsx`
Expected: PASS, 3 pruebas.

Si `expect(...).toBeDefined()` falla por falta de matchers del DOM, crear `vitest.setup.ts` con `import '@testing-library/jest-dom/vitest'` y registrarlo en `vitest.config.ts` con `test.setupFiles: ['./vitest.setup.ts']`.

- [ ] **Step 8: Implementar `SectionHeading` y `GlassPanel`**

Crear `src/shared/design/ui/SectionHeading.tsx`:

```tsx
import type { ReactNode } from 'react'

type Props = { eyebrow: string; title: ReactNode; align?: 'left' | 'center' }

export function SectionHeading({ eyebrow, title, align = 'center' }: Props) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  return (
    <div className={`flex flex-col gap-4 ${alignment}`}>
      <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{eyebrow}</span>
      <h2 className="font-display text-[clamp(30px,5vw,54px)] font-light leading-[1.08] text-ink">{title}</h2>
      <span className="h-px w-16 bg-gold/60" aria-hidden="true" />
    </div>
  )
}
```

Crear `src/shared/design/ui/GlassPanel.tsx`:

```tsx
import type { ReactNode } from 'react'

export function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised/70 shadow-[var(--shadow-float)] backdrop-blur-md ${className}`.trim()}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 9: Definir las variantes de movimiento**

Crear `src/shared/design/motion/variants.ts`:

```ts
import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 38, filter: 'blur(7px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

export const viewportOnce = { once: true, amount: 0.25 } as const
```

- [ ] **Step 10: Conectar fuentes y tokens en el layout raíz**

Reemplazar `src/app/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

El atributo `lang` lo fija el layout de `[locale]` en la Task 8.

- [ ] **Step 11: Verificar**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: verde.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: sistema de diseño con tokens Ivory, fuentes locales y primitivas de UI"
```

---

### Task 5: Base de datos — esquema, migraciones y seed

**Files:**
- Create: `src/shared/db/client.ts`, `src/shared/db/schema.ts`, `src/shared/db/seed.ts`, `drizzle.config.ts`, `docker/compose.dev.yml`
- Test: `src/shared/db/schema.test.ts`

**Interfaces:**
- Consumes: `env` de Task 2.
- Produces: `db` (cliente Drizzle), tablas `eventCategories`, `eventCategoryTranslations`, `plans`, `planTranslations`, `templates`, `templateTranslations`, `consultationRequests`, y el script `pnpm db:seed`.

- [ ] **Step 1: Levantar Postgres de desarrollo**

Crear `docker/compose.dev.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: invite
      POSTGRES_PASSWORD: invite
      POSTGRES_DB: invite
    ports:
      - '5432:5432'
    volumes:
      - invite_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U invite -d invite']
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  invite_pgdata:
```

Run: `docker compose -f docker/compose.dev.yml up -d`
Expected: contenedor `db` en estado healthy tras unos segundos.

- [ ] **Step 2: Definir el esquema**

Crear `src/shared/db/schema.ts`:

```ts
import { relations } from 'drizzle-orm'
import {
  boolean, char, date, index, integer, jsonb, pgTable, primaryKey,
  text, timestamp, uniqueIndex, uuid, varchar,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

export const eventCategories = pgTable('event_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const eventCategoryTranslations = pgTable(
  'event_category_translations',
  {
    categoryId: uuid('category_id').notNull().references(() => eventCategories.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
)

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  priceCents: integer('price_cents').notNull(),
  currency: char('currency', { length: 3 }).notNull().default('BOB'),
  highlighted: boolean('highlighted').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const planTranslations = pgTable(
  'plan_translations',
  {
    planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    tagline: varchar('tagline', { length: 200 }).notNull(),
    description: text('description').notNull(),
    features: jsonb('features').$type<string[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.locale] })],
)

export const templates = pgTable(
  'templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    categoryId: uuid('category_id').notNull().references(() => eventCategories.id),
    coverImagePath: varchar('cover_image_path', { length: 255 }).notNull(),
    palette: jsonb('palette').$type<{ base: string; accent: string }>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('templates_published_order_idx').on(t.isPublished, t.sortOrder)],
)

export const templateTranslations = pgTable(
  'template_translations',
  {
    templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull(),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.locale] })],
)

export const consultationRequests = pgTable(
  'consultation_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 200 }),
    phone: varchar('phone', { length: 32 }),
    categoryId: uuid('category_id').references(() => eventCategories.id),
    eventDate: date('event_date'),
    message: text('message'),
    locale: varchar('locale', { length: 5 }).notNull(),
    utm: jsonb('utm').$type<Record<string, string>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('consultation_requests_created_idx').on(t.createdAt)],
)

export const plansRelations = relations(plans, ({ many }) => ({ translations: many(planTranslations) }))
export const templatesRelations = relations(templates, ({ many, one }) => ({
  translations: many(templateTranslations),
  category: one(eventCategories, { fields: [templates.categoryId], references: [eventCategories.id] }),
}))
```

`uniqueIndex` queda importado para los índices que añade el Plan B; si ESLint marca la importación como no usada, quitarla.

- [ ] **Step 3: Crear el cliente**

Crear `src/shared/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/shared/config/env'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { __invitePg?: ReturnType<typeof postgres> }

const client = globalForDb.__invitePg ?? postgres(env.DATABASE_URL, { max: 10, idle_timeout: 20 })

if (env.NODE_ENV !== 'production') globalForDb.__invitePg = client

export const db = drizzle(client, { schema })
export type Database = typeof db
```

El singleton evita agotar el pool con el hot-reload de desarrollo.

Crear `drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/shared/db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
```

Añadir a `scripts` de `package.json`:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:seed": "node --experimental-strip-types src/shared/db/seed.ts"
}
```

- [ ] **Step 4: Generar y aplicar la migración**

```bash
cp .env.example .env.local
pnpm db:generate
DATABASE_URL=postgres://invite:invite@localhost:5432/invite pnpm db:migrate
```

Expected: aparece `db/migrations/0000_*.sql` y las tablas se crean.

- [ ] **Step 5: Escribir la prueba de integración que falla**

Crear `src/shared/db/schema.test.ts`:

```ts
import { sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from './client'

describe('esquema', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requerido para pruebas de integración')
  })

  it('tiene las tablas del catálogo', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    )
    const names = rows.map((r) => r.table_name)
    expect(names).toContain('plans')
    expect(names).toContain('plan_translations')
    expect(names).toContain('templates')
    expect(names).toContain('template_translations')
    expect(names).toContain('consultation_requests')
  })
})
```

- [ ] **Step 6: Ejecutar y verificar**

Run: `DATABASE_URL=postgres://invite:invite@localhost:5432/invite pnpm test src/shared/db/schema.test.ts`
Expected: PASS. Si falla por tablas faltantes, la migración del paso 4 no se aplicó.

- [ ] **Step 7: Escribir el seed**

Crear `src/shared/db/seed.ts`. Categorías: `boda`, `boda-civil`, `xv-anos`, `despedida`, `graduacion`, `bautizo`, `corporativo`. Planes y plantillas exactamente como en IVORY:

```ts
import { db } from './client'
import { eventCategories, eventCategoryTranslations, planTranslations, plans, templateTranslations, templates } from './schema'

const CATEGORIES = [
  { slug: 'boda', order: 1, es: 'Boda', en: 'Wedding' },
  { slug: 'boda-civil', order: 2, es: 'Boda civil', en: 'Civil ceremony' },
  { slug: 'xv-anos', order: 3, es: 'XV Años', en: 'Quinceañera' },
  { slug: 'despedida', order: 4, es: 'Despedida', en: 'Send-off party' },
  { slug: 'graduacion', order: 5, es: 'Graduación', en: 'Graduation' },
  { slug: 'bautizo', order: 6, es: 'Bautizo', en: 'Christening' },
  { slug: 'corporativo', order: 7, es: 'Corporativo', en: 'Corporate' },
] as const

const PLANS = [
  {
    slug: 'atelier', priceCents: 69000, highlighted: false, order: 1,
    es: { name: 'Atelier', tagline: 'Esencia elegante', description: 'Una escena, tarjeta animada y RSVP simple. Entrega en 72 horas.',
      features: ['Sobre animado y sello de cera', 'Galería de 8 fotografías', 'Cuenta regresiva y mapa', 'RSVP a WhatsApp'] },
    en: { name: 'Atelier', tagline: 'Elegant essence', description: 'One scene, an animated card and simple RSVP. Delivered in 72 hours.',
      features: ['Animated envelope and wax seal', 'Eight-photograph gallery', 'Countdown and map', 'RSVP straight to WhatsApp'] },
  },
  {
    slug: 'firma-3d', priceCents: 145000, highlighted: true, order: 2,
    es: { name: 'Firma 3D', tagline: 'La experiencia completa', description: 'Unboxing 3D completo, música, panel de invitados y dominio propio por un año.',
      features: ['Todo lo de Atelier', 'Apertura de sobre en 3D real', 'Música y transiciones cinemáticas', 'Panel de RSVP en vivo + mesas', 'Dominio propio 12 meses'] },
    en: { name: 'Signature 3D', tagline: 'The complete experience', description: 'Full 3D unboxing, music, guest panel and your own domain for a year.',
      features: ['Everything in Atelier', 'True 3D envelope opening', 'Music and cinematic transitions', 'Live RSVP panel and seating', 'Your own domain for 12 months'] },
  },
  {
    slug: 'alta-costura', priceCents: 290000, highlighted: false, order: 3,
    es: { name: 'Alta Costura', tagline: 'Hecho a medida', description: 'Concepto original, ilustración propia y dirección de arte para la boda completa.',
      features: ['Todo lo de Firma 3D', 'Monograma e ilustración a mano', 'Save the date + agradecimiento', 'Papelería imprimible coordinada', 'Concierge dedicado'] },
    en: { name: 'Haute Couture', tagline: 'Made to measure', description: 'Original concept, bespoke illustration and art direction for the whole wedding.',
      features: ['Everything in Signature 3D', 'Hand-drawn monogram and illustration', 'Save the date and thank-you piece', 'Coordinated printable stationery', 'Dedicated concierge'] },
  },
] as const

const TEMPLATES = [
  { slug: 'perla', category: 'boda', order: 1, palette: { base: '#fdfaf4', accent: '#c19b4a' }, es: 'Perla', en: 'Pearl' },
  { slug: 'marmol', category: 'boda', order: 2, palette: { base: '#f4f1ec', accent: '#8d7a52' }, es: 'Mármol', en: 'Marble' },
  { slug: 'laurel', category: 'boda-civil', order: 3, palette: { base: '#f2f4ef', accent: '#5f7350' }, es: 'Laurel', en: 'Laurel' },
  { slug: 'carmesi', category: 'boda', order: 4, palette: { base: '#f7efec', accent: '#b3775f' }, es: 'Carmesí', en: 'Crimson' },
  { slug: 'zafiro', category: 'xv-anos', order: 5, palette: { base: '#eef1f6', accent: '#7b8ea8' }, es: 'Zafiro', en: 'Sapphire' },
  { slug: 'nacarado', category: 'xv-anos', order: 6, palette: { base: '#fbf6f2', accent: '#d7c08a' }, es: 'Nacarado', en: 'Nacre' },
  { slug: 'onix', category: 'corporativo', order: 7, palette: { base: '#eceae7', accent: '#4a443c' }, es: 'Ónix', en: 'Onyx' },
  { slug: 'sobre', category: 'bautizo', order: 8, palette: { base: '#fbf9f4', accent: '#eed8a4' }, es: 'Sobre', en: 'Envelope' },
] as const

async function seed() {
  const categoryIds = new Map<string, string>()

  for (const c of CATEGORIES) {
    const [row] = await db.insert(eventCategories)
      .values({ slug: c.slug, sortOrder: c.order })
      .onConflictDoUpdate({ target: eventCategories.slug, set: { sortOrder: c.order } })
      .returning({ id: eventCategories.id })
    if (!row) throw new Error(`No se pudo insertar la categoría ${c.slug}`)
    categoryIds.set(c.slug, row.id)
    await db.insert(eventCategoryTranslations)
      .values([
        { categoryId: row.id, locale: 'es', name: c.es },
        { categoryId: row.id, locale: 'en', name: c.en },
      ])
      .onConflictDoNothing()
  }

  for (const p of PLANS) {
    const [row] = await db.insert(plans)
      .values({ slug: p.slug, priceCents: p.priceCents, currency: 'BOB', highlighted: p.highlighted, sortOrder: p.order })
      .onConflictDoUpdate({ target: plans.slug, set: { priceCents: p.priceCents, highlighted: p.highlighted, sortOrder: p.order } })
      .returning({ id: plans.id })
    if (!row) throw new Error(`No se pudo insertar el plan ${p.slug}`)
    await db.insert(planTranslations)
      .values([
        { planId: row.id, locale: 'es', ...p.es, features: [...p.es.features] },
        { planId: row.id, locale: 'en', ...p.en, features: [...p.en.features] },
      ])
      .onConflictDoNothing()
  }

  for (const t of TEMPLATES) {
    const categoryId = categoryIds.get(t.category)
    if (!categoryId) throw new Error(`Categoría desconocida: ${t.category}`)
    const [row] = await db.insert(templates)
      .values({ slug: t.slug, categoryId, coverImagePath: `/templates/${t.slug}.avif`, palette: t.palette, sortOrder: t.order })
      .onConflictDoUpdate({ target: templates.slug, set: { categoryId, sortOrder: t.order, palette: t.palette } })
      .returning({ id: templates.id })
    if (!row) throw new Error(`No se pudo insertar la plantilla ${t.slug}`)
    await db.insert(templateTranslations)
      .values([
        { templateId: row.id, locale: 'es', name: t.es, description: `Modelo ${t.es} del atelier InvitePremium.` },
        { templateId: row.id, locale: 'en', name: t.en, description: `The ${t.en} model from the InvitePremium atelier.` },
      ])
      .onConflictDoNothing()
  }

  console.log('Seed completo: %d categorías, %d planes, %d plantillas', CATEGORIES.length, PLANS.length, TEMPLATES.length)
}

await seed()
process.exit(0)
```

- [ ] **Step 8: Ejecutar el seed y verificar**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5432/invite pnpm db:seed
docker exec -i $(docker compose -f docker/compose.dev.yml ps -q db) psql -U invite -d invite -c "select slug, price_cents from plans order by sort_order;"
```

Expected: `atelier 69000`, `firma-3d 145000`, `alta-costura 290000`.

El seed es idempotente: ejecutarlo dos veces no duplica filas.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: esquema Postgres con traducciones, migraciones Drizzle y seed idempotente"
```

---

### Task 6: Dominio del catálogo

**Files:**
- Create: `src/modules/catalog/domain/money.ts`, `src/modules/catalog/domain/plan.ts`, `src/modules/catalog/domain/template.ts`, `src/modules/catalog/domain/errors.ts`
- Test: `src/modules/catalog/domain/money.test.ts`, `src/modules/catalog/domain/plan.test.ts`

**Interfaces:**
- Consumes: `Result`, `ok`, `err` de Task 1; `Locale` de Task 3.
- Produces:
  - `type Money = { readonly cents: number; readonly currency: 'BOB' }`
  - `createMoney(cents: number, currency?: 'BOB'): Result<Money, CatalogError>`
  - `formatMoney(money: Money, locale: Locale): string`
  - `type Plan = { id: string; slug: string; price: Money; highlighted: boolean; sortOrder: number; name: string; tagline: string; description: string; features: readonly string[] }`
  - `createPlan(input: PlanInput): Result<Plan, CatalogError>`
  - `type Template = { id: string; slug: string; categorySlug: string; categoryName: string; coverImagePath: string; palette: { base: string; accent: string }; sortOrder: number; name: string; description: string }`
  - `type CatalogError = { kind: 'invalid_price' | 'invalid_slug' | 'empty_features' | 'not_found'; detail: string }`

Todos los tipos son datos planos y serializables: pasan del Server Component al Client Component sin conversión.

- [ ] **Step 1: Escribir la prueba que falla de `Money`**

Crear `src/modules/catalog/domain/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createMoney, formatMoney } from './money'

describe('Money', () => {
  it('acepta un monto positivo', () => {
    const result = createMoney(69000)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.cents).toBe(69000)
  })

  it('rechaza montos cero o negativos', () => {
    expect(isErr(createMoney(0))).toBe(true)
    expect(isErr(createMoney(-1))).toBe(true)
  })

  it('rechaza montos no enteros', () => {
    const result = createMoney(690.5)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_price')
  })

  it('formatea en español sin decimales', () => {
    const result = createMoney(69000)
    if (!isOk(result)) throw new Error('esperaba un monto válido')
    expect(formatMoney(result.value, 'es')).toBe('Bs 690')
  })

  it('formatea en inglés con el mismo símbolo local', () => {
    const result = createMoney(145000)
    if (!isOk(result)) throw new Error('esperaba un monto válido')
    expect(formatMoney(result.value, 'en')).toBe('Bs 1,450')
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/catalog/domain/money.test.ts`
Expected: FAIL — no existe `./money`.

- [ ] **Step 3: Implementar errores y `Money`**

Crear `src/modules/catalog/domain/errors.ts`:

```ts
export type CatalogErrorKind = 'invalid_price' | 'invalid_slug' | 'empty_features' | 'not_found'

export type CatalogError = { readonly kind: CatalogErrorKind; readonly detail: string }

export const catalogError = (kind: CatalogErrorKind, detail: string): CatalogError => ({ kind, detail })
```

Crear `src/modules/catalog/domain/money.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import { catalogError, type CatalogError } from './errors'

export type Currency = 'BOB'

export type Money = { readonly cents: number; readonly currency: Currency }

const CENTS_PER_UNIT = 100

export function createMoney(cents: number, currency: Currency = 'BOB'): Result<Money, CatalogError> {
  if (!Number.isInteger(cents)) {
    return err(catalogError('invalid_price', `El precio debe ser un entero en centavos, recibido ${cents}`))
  }
  if (cents <= 0) {
    return err(catalogError('invalid_price', `El precio debe ser mayor a cero, recibido ${cents}`))
  }
  return ok({ cents, currency })
}

const GROUPING_LOCALE: Record<Locale, string> = { es: 'es-BO', en: 'en-US' }

export function formatMoney(money: Money, locale: Locale): string {
  const units = money.cents / CENTS_PER_UNIT
  const amount = new Intl.NumberFormat(GROUPING_LOCALE[locale], {
    minimumFractionDigits: 0,
    maximumFractionDigits: units % 1 === 0 ? 0 : 2,
  }).format(units)
  return `Bs ${amount}`
}
```

El símbolo `Bs` se antepone a mano en vez de usar `style: 'currency'` porque `Intl` produce `BOB 690` en inglés, y la marca siempre muestra `Bs`.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/catalog/domain/money.test.ts`
Expected: PASS, 5 pruebas. Si el formato español devuelve `690` con separador distinto, ajustar la expectativa al separador real de `es-BO` que reporte Node 22 y dejar la prueba fija en ese valor.

- [ ] **Step 5: Escribir la prueba que falla de `Plan`**

Crear `src/modules/catalog/domain/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createPlan } from './plan'

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'firma-3d',
  priceCents: 145000,
  highlighted: true,
  sortOrder: 2,
  name: 'Firma 3D',
  tagline: 'La experiencia completa',
  description: 'Unboxing 3D completo.',
  features: ['Todo lo de Atelier', 'Apertura de sobre en 3D real'],
}

describe('createPlan', () => {
  it('construye un plan válido', () => {
    const result = createPlan(base)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.price.cents).toBe(145000)
      expect(result.value.features).toHaveLength(2)
    }
  })

  it('rechaza un slug vacío', () => {
    const result = createPlan({ ...base, slug: '  ' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_slug')
  })

  it('rechaza un plan sin características', () => {
    const result = createPlan({ ...base, features: [] })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('empty_features')
  })

  it('propaga el error del precio', () => {
    const result = createPlan({ ...base, priceCents: -5 })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_price')
  })
})
```

- [ ] **Step 6: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/catalog/domain/plan.test.ts`
Expected: FAIL — no existe `./plan`.

- [ ] **Step 7: Implementar `Plan` y `Template`**

Crear `src/modules/catalog/domain/plan.ts`:

```ts
import { err, isErr, ok, type Result } from '@/shared/result'
import { catalogError, type CatalogError } from './errors'
import { createMoney, type Money } from './money'

export type Plan = {
  readonly id: string
  readonly slug: string
  readonly price: Money
  readonly highlighted: boolean
  readonly sortOrder: number
  readonly name: string
  readonly tagline: string
  readonly description: string
  readonly features: readonly string[]
}

export type PlanInput = {
  id: string
  slug: string
  priceCents: number
  highlighted: boolean
  sortOrder: number
  name: string
  tagline: string
  description: string
  features: readonly string[]
}

export function createPlan(input: PlanInput): Result<Plan, CatalogError> {
  const slug = input.slug.trim()
  if (slug.length === 0) {
    return err(catalogError('invalid_slug', 'El slug del plan no puede estar vacío'))
  }
  if (input.features.length === 0) {
    return err(catalogError('empty_features', `El plan ${slug} no tiene características`))
  }

  const price = createMoney(input.priceCents)
  if (isErr(price)) return price

  return ok({
    id: input.id,
    slug,
    price: price.value,
    highlighted: input.highlighted,
    sortOrder: input.sortOrder,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    features: [...input.features],
  })
}
```

Crear `src/modules/catalog/domain/template.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { catalogError, type CatalogError } from './errors'

export type Palette = { readonly base: string; readonly accent: string }

export type Template = {
  readonly id: string
  readonly slug: string
  readonly categorySlug: string
  readonly categoryName: string
  readonly coverImagePath: string
  readonly palette: Palette
  readonly sortOrder: number
  readonly name: string
  readonly description: string
}

export function createTemplate(input: Template): Result<Template, CatalogError> {
  const slug = input.slug.trim()
  if (slug.length === 0) {
    return err(catalogError('invalid_slug', 'El slug de la plantilla no puede estar vacío'))
  }
  return ok({ ...input, slug })
}
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/catalog/domain`
Expected: PASS, 9 pruebas.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(catalog): dominio de planes, plantillas y dinero con Result tipado"
```

---

### Task 7: Casos de uso y repositorios del catálogo

**Files:**
- Create: `src/modules/catalog/application/ports.ts`, `src/modules/catalog/application/list-plans.ts`, `src/modules/catalog/application/list-templates.ts`, `src/modules/catalog/application/get-template.ts`, `src/modules/catalog/infrastructure/mappers.ts`, `src/modules/catalog/infrastructure/drizzle-plan-repository.ts`, `src/modules/catalog/infrastructure/drizzle-template-repository.ts`, `src/modules/catalog/index.ts`, `src/shared/composition/container.ts`
- Test: `src/modules/catalog/application/list-plans.test.ts`, `src/modules/catalog/infrastructure/drizzle-repositories.test.ts`

**Interfaces:**
- Consumes: dominio de Task 6, `db` de Task 5, `Locale` de Task 3.
- Produces:
  - `interface PlanRepository { listActive(locale: Locale): Promise<PlanInput[]> }`
  - `interface TemplateRepository { listPublished(locale: Locale): Promise<Template[]>; findBySlug(slug: string, locale: Locale): Promise<Template | null> }`
  - `listPlans(deps: { plans: PlanRepository }): (locale: Locale) => Promise<Result<Plan[], CatalogError>>`
  - `listTemplates(deps: { templates: TemplateRepository }): (locale: Locale) => Promise<Result<Template[], CatalogError>>`
  - `getTemplate(deps: { templates: TemplateRepository }): (slug: string, locale: Locale) => Promise<Result<Template, CatalogError>>`
  - `catalog` (objeto de la raíz de composición con `listPlans`, `listTemplates`, `getTemplate` ya inyectados)

- [ ] **Step 1: Escribir la prueba que falla del caso de uso**

Crear `src/modules/catalog/application/list-plans.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { PlanInput } from '../domain/plan'
import { listPlans } from './list-plans'
import type { PlanRepository } from './ports'

const row: PlanInput = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'atelier',
  priceCents: 69000,
  highlighted: false,
  sortOrder: 1,
  name: 'Atelier',
  tagline: 'Esencia elegante',
  description: 'Una escena.',
  features: ['Sobre animado'],
}

const repositoryOf = (rows: PlanInput[]): PlanRepository => ({
  listActive: async () => rows,
})

describe('listPlans', () => {
  it('devuelve los planes ordenados por sortOrder', async () => {
    const second: PlanInput = { ...row, id: '22222222-2222-2222-2222-222222222222', slug: 'firma-3d', sortOrder: 2 }
    const result = await listPlans({ plans: repositoryOf([second, row]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.map((p) => p.slug)).toEqual(['atelier', 'firma-3d'])
  })

  it('falla si un plan de la base es inválido', async () => {
    const result = await listPlans({ plans: repositoryOf([{ ...row, priceCents: 0 }]) })('es')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_price')
  })

  it('devuelve lista vacía sin planes', async () => {
    const result = await listPlans({ plans: repositoryOf([]) })('es')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/catalog/application/list-plans.test.ts`
Expected: FAIL — no existen `./list-plans` ni `./ports`.

- [ ] **Step 3: Implementar puertos y casos de uso**

Crear `src/modules/catalog/application/ports.ts`:

```ts
import type { Locale } from '@/shared/i18n/locales'
import type { PlanInput } from '../domain/plan'
import type { Template } from '../domain/template'

export interface PlanRepository {
  listActive(locale: Locale): Promise<PlanInput[]>
}

export interface TemplateRepository {
  listPublished(locale: Locale): Promise<Template[]>
  findBySlug(slug: string, locale: Locale): Promise<Template | null>
}
```

Crear `src/modules/catalog/application/list-plans.ts`:

```ts
import { isErr, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import type { CatalogError } from '../domain/errors'
import { createPlan, type Plan } from '../domain/plan'
import type { PlanRepository } from './ports'

export const listPlans =
  (deps: { plans: PlanRepository }) =>
  async (locale: Locale): Promise<Result<Plan[], CatalogError>> => {
    const rows = await deps.plans.listActive(locale)
    const built: Plan[] = []

    for (const row of rows) {
      const plan = createPlan(row)
      if (isErr(plan)) return plan
      built.push(plan.value)
    }

    built.sort((a, b) => a.sortOrder - b.sortOrder)
    return ok(built)
  }
```

Crear `src/modules/catalog/application/list-templates.ts`:

```ts
import { ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import type { CatalogError } from '../domain/errors'
import type { Template } from '../domain/template'
import type { TemplateRepository } from './ports'

export const listTemplates =
  (deps: { templates: TemplateRepository }) =>
  async (locale: Locale): Promise<Result<Template[], CatalogError>> => {
    const rows = await deps.templates.listPublished(locale)
    return ok([...rows].sort((a, b) => a.sortOrder - b.sortOrder))
  }
```

Crear `src/modules/catalog/application/get-template.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import { catalogError, type CatalogError } from '../domain/errors'
import type { Template } from '../domain/template'
import type { TemplateRepository } from './ports'

export const getTemplate =
  (deps: { templates: TemplateRepository }) =>
  async (slug: string, locale: Locale): Promise<Result<Template, CatalogError>> => {
    const found = await deps.templates.findBySlug(slug, locale)
    if (!found) return err(catalogError('not_found', `No existe la plantilla ${slug}`))
    return ok(found)
  }
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/catalog/application/list-plans.test.ts`
Expected: PASS, 3 pruebas.

- [ ] **Step 5: Implementar los repositorios Drizzle**

Crear `src/modules/catalog/infrastructure/drizzle-plan-repository.ts`:

```ts
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { planTranslations, plans } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { PlanInput } from '../domain/plan'
import type { PlanRepository } from '../application/ports'

export const drizzlePlanRepository: PlanRepository = {
  async listActive(locale: Locale): Promise<PlanInput[]> {
    const rows = await db
      .select({
        id: plans.id,
        slug: plans.slug,
        priceCents: plans.priceCents,
        highlighted: plans.highlighted,
        sortOrder: plans.sortOrder,
        name: planTranslations.name,
        tagline: planTranslations.tagline,
        description: planTranslations.description,
        features: planTranslations.features,
      })
      .from(plans)
      .innerJoin(planTranslations, eq(planTranslations.planId, plans.id))
      .where(and(eq(plans.isActive, true), eq(planTranslations.locale, locale)))
      .orderBy(asc(plans.sortOrder))

    return rows.map((row) => ({ ...row, features: row.features }))
  },
}
```

Crear `src/modules/catalog/infrastructure/drizzle-template-repository.ts`:

```ts
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { eventCategories, eventCategoryTranslations, templateTranslations, templates } from '@/shared/db/schema'
import type { Locale } from '@/shared/i18n/locales'
import type { Template } from '../domain/template'
import type { TemplateRepository } from '../application/ports'

const selectTemplate = {
  id: templates.id,
  slug: templates.slug,
  categorySlug: eventCategories.slug,
  categoryName: eventCategoryTranslations.name,
  coverImagePath: templates.coverImagePath,
  palette: templates.palette,
  sortOrder: templates.sortOrder,
  name: templateTranslations.name,
  description: templateTranslations.description,
}

export const drizzleTemplateRepository: TemplateRepository = {
  async listPublished(locale: Locale): Promise<Template[]> {
    return db
      .select(selectTemplate)
      .from(templates)
      .innerJoin(templateTranslations, and(eq(templateTranslations.templateId, templates.id), eq(templateTranslations.locale, locale)))
      .innerJoin(eventCategories, eq(eventCategories.id, templates.categoryId))
      .innerJoin(eventCategoryTranslations, and(eq(eventCategoryTranslations.categoryId, eventCategories.id), eq(eventCategoryTranslations.locale, locale)))
      .where(eq(templates.isPublished, true))
      .orderBy(asc(templates.sortOrder))
  },

  async findBySlug(slug: string, locale: Locale): Promise<Template | null> {
    const rows = await db
      .select(selectTemplate)
      .from(templates)
      .innerJoin(templateTranslations, and(eq(templateTranslations.templateId, templates.id), eq(templateTranslations.locale, locale)))
      .innerJoin(eventCategories, eq(eventCategories.id, templates.categoryId))
      .innerJoin(eventCategoryTranslations, and(eq(eventCategoryTranslations.categoryId, eventCategories.id), eq(eventCategoryTranslations.locale, locale)))
      .where(and(eq(templates.slug, slug), eq(templates.isPublished, true)))
      .limit(1)

    return rows[0] ?? null
  },
}
```

- [ ] **Step 6: Escribir la prueba de integración**

Crear `src/modules/catalog/infrastructure/drizzle-repositories.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { drizzlePlanRepository } from './drizzle-plan-repository'
import { drizzleTemplateRepository } from './drizzle-template-repository'

describe('repositorios Drizzle (requiere base sembrada)', () => {
  it('lee los tres planes en español', async () => {
    const rows = await drizzlePlanRepository.listActive('es')
    expect(rows.map((r) => r.slug)).toEqual(['atelier', 'firma-3d', 'alta-costura'])
    expect(rows[0]?.name).toBe('Atelier')
  })

  it('lee los planes en inglés con el mismo precio', async () => {
    const es = await drizzlePlanRepository.listActive('es')
    const en = await drizzlePlanRepository.listActive('en')
    expect(en.map((r) => r.priceCents)).toEqual(es.map((r) => r.priceCents))
    expect(en[1]?.name).toBe('Signature 3D')
  })

  it('lee las ocho plantillas publicadas', async () => {
    const rows = await drizzleTemplateRepository.listPublished('es')
    expect(rows).toHaveLength(8)
    expect(rows[0]?.slug).toBe('perla')
    expect(rows[0]?.categoryName).toBe('Boda')
  })

  it('encuentra una plantilla por slug y devuelve null si no existe', async () => {
    expect(await drizzleTemplateRepository.findBySlug('zafiro', 'es')).not.toBeNull()
    expect(await drizzleTemplateRepository.findBySlug('inexistente', 'es')).toBeNull()
  })
})
```

- [ ] **Step 7: Ejecutar contra la base sembrada**

Run:

```bash
DATABASE_URL=postgres://invite:invite@localhost:5432/invite SITE_URL=http://localhost:3000 \
  pnpm test src/modules/catalog/infrastructure/drizzle-repositories.test.ts
```

Expected: PASS, 4 pruebas.

- [ ] **Step 8: Escribir la raíz de composición y la superficie pública**

Crear `src/shared/composition/container.ts`:

```ts
import { getTemplate } from '@/modules/catalog/application/get-template'
import { listPlans } from '@/modules/catalog/application/list-plans'
import { listTemplates } from '@/modules/catalog/application/list-templates'
import { drizzlePlanRepository } from '@/modules/catalog/infrastructure/drizzle-plan-repository'
import { drizzleTemplateRepository } from '@/modules/catalog/infrastructure/drizzle-template-repository'

export const catalog = {
  listPlans: listPlans({ plans: drizzlePlanRepository }),
  listTemplates: listTemplates({ templates: drizzleTemplateRepository }),
  getTemplate: getTemplate({ templates: drizzleTemplateRepository }),
} as const
```

Crear `src/modules/catalog/index.ts`:

```ts
export type { CatalogError } from './domain/errors'
export type { Money } from './domain/money'
export { formatMoney } from './domain/money'
export type { Plan } from './domain/plan'
export type { Palette, Template } from './domain/template'
export type { PlanRepository, TemplateRepository } from './application/ports'
```

Esta es la única superficie que otros módulos y la UI pueden importar del catálogo.

- [ ] **Step 9: Verificar la suite completa**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: verde. Si ESLint marca que `app` importa `infrastructure`, revisar que la importación pase por `src/shared/composition/container.ts`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(catalog): casos de uso, repositorios Drizzle y raíz de composición"
```

---

### Task 8: Cascarón de la landing — layout de idioma, cabecera y pie

**Files:**
- Create: `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/sections/SiteHeader.tsx`, `src/sections/SiteFooter.tsx`, `src/shared/i18n/server.ts`
- Delete: `src/app/page.tsx` (la raíz la resuelve el middleware)
- Test: `src/shared/i18n/server.test.ts`

**Interfaces:**
- Consumes: `getDictionary`, `isLocale`, `LOCALES` de Task 3; `Button` de Task 4.
- Produces: `resolveLocaleParam(value: string): Locale` (lanza `notFound()` si no es válido), `SiteHeader({ locale, dictionary })`, `SiteFooter({ locale, dictionary })`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/shared/i18n/server.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseLocaleParam } from './server'

describe('parseLocaleParam', () => {
  it('acepta los idiomas soportados', () => {
    expect(parseLocaleParam('es')).toBe('es')
    expect(parseLocaleParam('en')).toBe('en')
  })

  it('devuelve null para un idioma no soportado', () => {
    expect(parseLocaleParam('fr')).toBeNull()
    expect(parseLocaleParam('')).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test src/shared/i18n/server.test.ts`
Expected: FAIL — no existe `./server`.

- [ ] **Step 3: Implementar**

Crear `src/shared/i18n/server.ts`:

```ts
import { isLocale, type Locale } from './locales'

export function parseLocaleParam(value: string): Locale | null {
  return isLocale(value) ? value : null
}
```

`notFound()` se llama en el layout, no aquí, para que esta función sea comprobable sin el runtime de Next.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test src/shared/i18n/server.test.ts`
Expected: PASS, 2 pruebas.

- [ ] **Step 5: Crear el layout de idioma**

Crear `src/app/[locale]/layout.tsx`:

```tsx
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { LOCALES } from '@/shared/i18n/locales'
import { parseLocaleParam } from '@/shared/i18n/server'
import { SiteFooter } from '@/sections/SiteFooter'
import { SiteHeader } from '@/sections/SiteHeader'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  return (
    <div lang={locale}>
      <SiteHeader locale={locale} dictionary={dictionary} />
      <main id="top">{children}</main>
      <SiteFooter locale={locale} dictionary={dictionary} />
    </div>
  )
}
```

Modificar `src/app/layout.tsx` para que el `<html lang>` se sincronice: añadir `lang="en"` como valor por defecto en `<html>`; el `div lang` del layout de idioma sobreescribe el idioma del contenido para lectores de pantalla.

- [ ] **Step 6: Implementar la cabecera**

Crear `src/sections/SiteHeader.tsx`, portando el markup de IVORY líneas 36-66 (píldora flotante con `backdrop-blur`, navegación a los lados y logotipo centrado con degradado dorado):

```tsx
import Link from 'next/link'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { Button } from '@/shared/design/ui/Button'

type Props = { locale: Locale; dictionary: Dictionary }

export function SiteHeader({ locale, dictionary }: Props) {
  const links = [
    { href: '#colecciones', label: dictionary.nav.collections },
    { href: '#experiencia', label: dictionary.nav.experience },
    { href: '#precios', label: dictionary.nav.pricing },
  ]

  return (
    <header className="fixed inset-x-0 top-[18px] z-70 flex justify-center px-4">
      <div className="flex w-full max-w-[1180px] items-center gap-8 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-bg-raised/72 px-6 py-3 shadow-[var(--shadow-float)] backdrop-blur-[18px]">
        <nav className="hidden flex-1 items-center justify-end gap-8 text-[11.5px] uppercase tracking-[var(--tracking-luxe)] md:flex">
          {links.slice(0, 2).map((link) => (
            <a key={link.href} className="text-ink-soft transition-colors hover:text-gold-deep" href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <Link className="flex flex-col items-center px-2 leading-none" href={`/${locale}`}>
          <span className="bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text font-display text-[27px] font-medium tracking-[0.13em] text-transparent">
            LUXE
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.3em] text-ink-mute">InvitePremium</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-8 text-[11.5px] uppercase tracking-[var(--tracking-luxe)] md:flex">
          <a className="text-ink-soft transition-colors hover:text-gold-deep" href="#precios">
            {dictionary.nav.pricing}
          </a>
          <Button href="#contacto" className="ml-auto">
            {dictionary.nav.contact}
          </Button>
        </nav>

        <Button href="#contacto" className="ml-auto md:hidden">
          {dictionary.nav.contact}
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 7: Implementar el pie**

Crear `src/sections/SiteFooter.tsx`, portando IVORY líneas 770-780:

```tsx
import { BRAND } from '@/shared/config/brand'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'

export function SiteFooter({ dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const year = new Date().getUTCFullYear()

  return (
    <footer className="border-t border-[var(--color-line)] px-6 py-14 text-center">
      <p className="font-display text-[22px] tracking-[0.12em] text-ink">LUXE · {BRAND.siteName}</p>
      <p className="mt-3 text-[12px] text-ink-mute">{dictionary.footer.coverage}</p>
      <p className="mt-6 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
        © {year} {dictionary.footer.rights}
      </p>
    </footer>
  )
}
```

- [ ] **Step 8: Crear la página de landing provisional**

Crear `src/app/[locale]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  return (
    <div className="mx-auto max-w-[1180px] px-6 pt-[180px]">
      <h1 className="font-display text-[clamp(40px,8vw,96px)] font-light leading-[0.95]">
        {dictionary.hero.titleLine1}
      </h1>
    </div>
  )
}
```

Las secciones reales llegan en la Task 9; este paso solo verifica que el enrutado por idioma funciona de punta a punta.

- [ ] **Step 9: Verificar en el navegador**

```bash
docker compose -f docker/compose.dev.yml up -d
DATABASE_URL=postgres://invite:invite@localhost:5432/invite SITE_URL=http://localhost:3000 pnpm dev
```

Comprobar manualmente:

```bash
curl -sI -H 'Accept-Language: es-BO,es;q=0.9' http://localhost:3000/ | grep -i location
curl -sI -H 'Accept-Language: de-DE'          http://localhost:3000/ | grep -i location
curl -sI http://localhost:3000/fr | head -1
```

Expected: primero `location: /es`, segundo `location: /en`, tercero `HTTP/1.1 404`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: cascarón de landing con rutas por idioma, cabecera flotante y pie"
```

---

### Task 9: Secciones editoriales de la landing

**Files:**
- Create: `src/sections/HeroSection.tsx`, `src/sections/StatsStrip.tsx`, `src/sections/ExperienceSection.tsx`, `src/sections/MobileSection.tsx`, `src/sections/ComparisonSection.tsx`, `src/sections/TestimonialsSection.tsx`, `src/sections/FaqSection.tsx`, `src/shared/design/ui/Reveal.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Test: `src/sections/ComparisonSection.test.tsx`, `src/sections/FaqSection.test.tsx`

**Interfaces:**
- Consumes: `Dictionary`, `Locale`, `Button`, `SectionHeading`, `GlassPanel`, `fadeUp`, `stagger`.
- Produces: cada sección exporta un componente que recibe `{ dictionary, locale }` y nada más. El hero acepta además `slot?: ReactNode` para inyectar el canvas 3D en la Task 11 sin modificar la sección.

Referencias de markup en IVORY: hero 68-128, experiencia 129-174, móvil 175-207, comparativa 293-336, testimonios 660-700.

- [ ] **Step 1: Crear el envoltorio de revelado**

Crear `src/shared/design/ui/Reveal.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeUp, viewportOnce } from '@/shared/design/motion/variants'

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}
```

Framer Motion desactiva sus animaciones cuando el sistema pide movimiento reducido gracias a la regla CSS global de la Task 4; además, `Reveal` nunca oculta contenido para lectores de pantalla porque solo anima opacidad y desplazamiento.

- [ ] **Step 2: Implementar el hero**

Crear `src/sections/HeroSection.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Button } from '@/shared/design/ui/Button'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

type Props = { dictionary: Dictionary; slot?: ReactNode }

export function HeroSection({ dictionary, slot }: Props) {
  const { hero } = dictionary

  return (
    <section className="relative px-5 pb-20 pt-[clamp(132px,16vw,168px)]" id="hero">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal className="flex flex-col gap-7">
          <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{hero.eyebrow}</span>
          <h1 className="font-display text-[clamp(42px,7.4vw,92px)] font-light leading-[0.98] text-ink">
            {hero.titleLine1}
            <br />
            {hero.titleLine2}
            <br />
            <em className="bg-gradient-to-r from-gold-deep via-gold-light to-gold-deep bg-clip-text not-italic text-transparent">
              {hero.titleAccent}
            </em>
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-[1.75] text-ink-soft">{hero.body}</p>
          <div className="flex flex-wrap gap-4">
            <Button href="#contacto">{hero.ctaPrimary}</Button>
            <Button href="#experiencia" variant="ghost">{hero.ctaSecondary}</Button>
          </div>
        </Reveal>

        <div className="relative min-h-[420px]">{slot}</div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Implementar la franja de cifras**

Crear `src/sections/StatsStrip.tsx` con las cuatro cifras de IVORY (eventos entregados, entrega promedio, confirmación RSVP, países alcanzados). Los valores son constantes de marca, no datos de base:

```tsx
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

const VALUES = ['320+', '72 h', '94%', '7'] as const

export function StatsStrip({ dictionary }: { dictionary: Dictionary }) {
  const labels = [dictionary.stats.events, dictionary.stats.delivery, dictionary.stats.rsvp, dictionary.stats.countries]

  return (
    <section className="px-6 py-16">
      <Reveal className="mx-auto grid max-w-[1180px] grid-cols-2 gap-8 border-y border-[var(--color-line)] py-10 md:grid-cols-4">
        {labels.map((label, index) => (
          <div key={label} className="text-center">
            <p className="font-display text-[40px] font-light text-gold-deep">{VALUES[index]}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}
```

- [ ] **Step 4: Implementar experiencia y móvil**

Crear `src/sections/ExperienceSection.tsx` con `id="experiencia"`: `SectionHeading` con `dictionary.experience.eyebrow` y `.title`, luego una rejilla de tres `GlassPanel`, uno por acto, cada uno con etiqueta (`Acto I`), título y cuerpo, revelados en cascada con `Reveal` y retraso `index * 0.1`.

Crear `src/sections/MobileSection.tsx` con `id="movil"`: dos columnas — a la izquierda el texto (`eyebrow`, `title`, `body`, lista de tres viñetas con marca dorada), a la derecha una maqueta de teléfono construida con CSS (marco redondeado `rounded-[42px]`, borde `border-[var(--color-line)]`, sombra `--shadow-lift`) que contiene una imagen de plantilla. Sin WebGL.

- [ ] **Step 5: Escribir la prueba que falla de la comparativa**

Crear `src/sections/ComparisonSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { ComparisonSection } from './ComparisonSection'

describe('ComparisonSection', () => {
  it('muestra las cinco ventajas LUXE y las cinco tradicionales', () => {
    render(<ComparisonSection dictionary={es} />)
    for (const item of es.comparison.luxe) expect(screen.getByText(item)).toBeDefined()
    for (const item of es.comparison.traditional) expect(screen.getByText(item)).toBeDefined()
  })

  it('rotula las dos columnas de forma accesible', () => {
    render(<ComparisonSection dictionary={es} />)
    expect(screen.getByRole('region', { name: es.comparison.title })).toBeDefined()
  })
})
```

- [ ] **Step 6: Ejecutar y verificar que falla**

Run: `pnpm test src/sections/ComparisonSection.test.tsx`
Expected: FAIL — no existe `./ComparisonSection`.

- [ ] **Step 7: Implementar la comparativa**

Crear `src/sections/ComparisonSection.tsx` con `id="diferencia"`. Dos columnas: la izquierda con fondo `bg-bg-raised` y viñetas doradas para LUXE; la derecha con fondo `bg-bg-sunken`, texto `text-ink-mute` y viñetas grises para la invitación tradicional. La sección lleva `aria-labelledby` apuntando al `h2` para que la prueba encuentre el rol `region`:

```tsx
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import { Reveal } from '@/shared/design/ui/Reveal'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export function ComparisonSection({ dictionary }: { dictionary: Dictionary }) {
  const { comparison } = dictionary

  return (
    <section aria-labelledby="comparison-title" className="px-6 py-24" id="diferencia">
      <div className="mx-auto max-w-[1180px]">
        <SectionHeading eyebrow={comparison.eyebrow} title={<span id="comparison-title">{comparison.title}</span>} />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Reveal className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised p-8 shadow-[var(--shadow-float)]">
            <p className="font-display text-[26px] text-gold-deep">LUXE</p>
            <ul className="mt-6 flex flex-col gap-4">
              {comparison.luxe.map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-[1.6] text-ink-soft">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-sunken p-8" delay={0.1}>
            <p className="font-display text-[26px] text-ink-mute">Tradicional</p>
            <ul className="mt-6 flex flex-col gap-4">
              {comparison.traditional.map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-[1.6] text-ink-mute">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-mute/50" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
```

El rótulo `Tradicional` sale del diccionario en la implementación final: añadir la clave `comparison.traditionalLabel` a `es.ts` (`'Tradicional'`) y a `en.ts` (`'Traditional'`) y usarla aquí.

- [ ] **Step 8: Ejecutar y verificar que pasa**

Run: `pnpm test src/sections/ComparisonSection.test.tsx`
Expected: PASS, 2 pruebas.

- [ ] **Step 9: Escribir la prueba que falla de preguntas frecuentes**

Crear `src/sections/FaqSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { FaqSection } from './FaqSection'

describe('FaqSection', () => {
  it('renderiza cada pregunta como disclosure nativo', () => {
    render(<FaqSection dictionary={es} />)
    for (const item of es.faq.items) {
      expect(screen.getByText(item.question)).toBeDefined()
    }
  })
})
```

- [ ] **Step 10: Implementar preguntas frecuentes**

Añadir al diccionario `es.ts` (y su equivalente en `en.ts`):

```ts
faq: {
  eyebrow: 'Preguntas frecuentes',
  title: 'Todo lo que suelen preguntarnos',
  items: [
    { question: '¿Cuánto tarda la entrega?', answer: 'Entre 72 horas y 7 días según el plan. Alta Costura incluye una fase de concepto previa.' },
    { question: '¿El invitado necesita instalar algo?', answer: 'No. La invitación se abre en el navegador desde un enlace de WhatsApp, sin apps ni descargas.' },
    { question: '¿Puedo enviar un enlace distinto a cada invitado?', answer: 'Sí. Cada invitado recibe su enlace con su nombre y su confirmación individual.' },
    { question: '¿Funciona sin conexión estable?', answer: 'La invitación pesa menos de 2 MB y carga por partes, así que funciona en redes lentas.' },
    { question: '¿Qué pasa si necesito cambiar la fecha o el lugar?', answer: 'Los datos se actualizan en vivo: el enlace ya enviado muestra la información nueva.' },
  ],
} as const
```

Crear `src/sections/FaqSection.tsx` usando `<details>`/`<summary>` nativos — accesibles y sin JavaScript — con `SectionHeading` arriba y `id="faq"`.

- [ ] **Step 11: Ejecutar y verificar que pasa**

Run: `pnpm test src/sections/FaqSection.test.tsx`
Expected: PASS.

- [ ] **Step 12: Implementar testimonios**

Crear `src/sections/TestimonialsSection.tsx` con las citas de IVORY (Daniela Ortiz, wedding planner de Cochabamba, y las dos restantes del archivo). Añadir las citas al diccionario bajo la clave `testimonials.items` con `{ quote, author, role }`. Rejilla de tres `GlassPanel` con comillas en `font-display`.

- [ ] **Step 13: Componer la landing**

Modificar `src/app/[locale]/page.tsx` para renderizar, en este orden: `HeroSection`, `StatsStrip`, `ExperienceSection`, `MobileSection`, `ComparisonSection`, `TestimonialsSection`, `FaqSection`. Las secciones de catálogo y contacto entran en las Tasks 10 y 12.

- [ ] **Step 14: Verificar**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: verde; el build no debe emitir avisos de hidratación.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: secciones editoriales de la landing con revelado por scroll"
```

---

### Task 10: Secciones de catálogo — precios, modelos y colecciones

**Files:**
- Create: `src/modules/catalog/ui/PlanCard.tsx`, `src/modules/catalog/ui/PricingSection.tsx`, `src/modules/catalog/ui/TemplateCard.tsx`, `src/modules/catalog/ui/ModelsSection.tsx`, `src/modules/catalog/ui/CollectionsCarousel.tsx`, `src/app/[locale]/colecciones/page.tsx`, `public/templates/*.avif`
- Modify: `src/app/[locale]/page.tsx`, `src/modules/catalog/index.ts`
- Test: `src/modules/catalog/ui/PlanCard.test.tsx`, `src/modules/catalog/ui/CollectionsCarousel.test.tsx`

**Interfaces:**
- Consumes: `catalog` (raíz de composición), `Plan`, `Template`, `formatMoney`, `Dictionary`.
- Produces: `PlanCard({ plan, locale, dictionary, ctaHref })`, `PricingSection({ plans, locale, dictionary })`, `TemplateCard({ template, dictionary })`, `ModelsSection({ templates, dictionary })`, `CollectionsCarousel({ templates, dictionary })`.

Las secciones reciben los datos ya resueltos por props: no consultan la base. El Server Component de la página es el único que llama a `catalog`.

- [ ] **Step 1: Preparar las imágenes de plantillas**

```bash
mkdir -p public/templates
ls "/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/uploads"
```

Copiar una imagen por plantilla y convertirla a AVIF con ancho máximo 900 px, nombrándolas exactamente `perla.avif`, `marmol.avif`, `laurel.avif`, `carmesi.avif`, `zafiro.avif`, `nacarado.avif`, `onix.avif`, `sobre.avif` (los slugs del seed):

```bash
pnpm dlx sharp-cli --input "ruta/origen.jpg" --output public/templates/perla.avif --format avif --width 900 --quality 62
```

Verificar que cada archivo pesa menos de 120 KB: `du -h public/templates/*.avif`.

- [ ] **Step 2: Escribir la prueba que falla de `PlanCard`**

Crear `src/modules/catalog/ui/PlanCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import type { Plan } from '../domain/plan'
import { PlanCard } from './PlanCard'

const plan: Plan = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'firma-3d',
  price: { cents: 145000, currency: 'BOB' },
  highlighted: true,
  sortOrder: 2,
  name: 'Firma 3D',
  tagline: 'La experiencia completa',
  description: 'Unboxing 3D completo.',
  features: ['Todo lo de Atelier', 'Dominio propio 12 meses'],
}

describe('PlanCard', () => {
  it('muestra el precio formateado en bolivianos', () => {
    render(<PlanCard plan={plan} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.getByText('Bs 1.450')).toBeDefined()
  })

  it('muestra la insignia solo cuando el plan está destacado', () => {
    const { rerender } = render(<PlanCard plan={plan} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.getByText(es.pricing.mostChosen)).toBeDefined()

    rerender(<PlanCard plan={{ ...plan, highlighted: false }} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.queryByText(es.pricing.mostChosen)).toBeNull()
  })

  it('lista todas las características', () => {
    render(<PlanCard plan={plan} locale="es" dictionary={es} ctaHref="#contacto" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(plan.features.length)
  })
})
```

El separador de miles esperado (`1.450` o `1,450`) debe coincidir con el que produjo la Task 6 para `es-BO` en Node 22; ajustar la cadena literal si difiere y dejarla fija.

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/catalog/ui/PlanCard.test.tsx`
Expected: FAIL — no existe `./PlanCard`.

- [ ] **Step 4: Implementar `PlanCard` y `PricingSection`**

Crear `src/modules/catalog/ui/PlanCard.tsx`:

```tsx
import { Button } from '@/shared/design/ui/Button'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { formatMoney } from '../domain/money'
import type { Plan } from '../domain/plan'

type Props = { plan: Plan; locale: Locale; dictionary: Dictionary; ctaHref: string }

export function PlanCard({ plan, locale, dictionary, ctaHref }: Props) {
  const frame = plan.highlighted
    ? 'border-gold bg-bg-raised shadow-[var(--shadow-lift)] md:-translate-y-4'
    : 'border-[var(--color-line)] bg-bg-raised/70'

  return (
    <article className={`relative flex flex-col rounded-[var(--radius-card)] border p-8 backdrop-blur-md ${frame}`}>
      {plan.highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-gold px-4 py-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised">
          {dictionary.pricing.mostChosen}
        </span>
      ) : null}

      <p className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">{plan.name}</p>
      <p className="mt-2 font-display text-[24px] font-light text-ink">{plan.tagline}</p>

      <p className="mt-6 font-display text-[44px] font-light leading-none text-ink">{formatMoney(plan.price, locale)}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{plan.price.currency}</p>

      <p className="mt-5 text-[14px] leading-[1.7] text-ink-soft">{plan.description}</p>

      <ul className="mt-7 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-[13.5px] leading-[1.6] text-ink-soft">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {feature}
          </li>
        ))}
      </ul>

      <Button className="mt-8 w-full" href={ctaHref} variant={plan.highlighted ? 'gold' : 'ghost'}>
        {plan.name}
      </Button>
    </article>
  )
}
```

Crear `src/modules/catalog/ui/PricingSection.tsx` con `id="precios"`, `SectionHeading` (`dictionary.pricing.eyebrow` / `.title`) y una rejilla de tres columnas en escritorio, una en móvil, mapeando `plans` a `PlanCard`.

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/catalog/ui/PlanCard.test.tsx`
Expected: PASS, 3 pruebas.

- [ ] **Step 6: Implementar `TemplateCard` y `ModelsSection`**

Crear `src/modules/catalog/ui/TemplateCard.tsx`: tarjeta vertical con `next/image` (`width={450} height={640}`, `sizes="(max-width: 768px) 80vw, 280px"`), etiqueta de categoría arriba, nombre de la plantilla en `font-display` abajo, borde que toma `template.palette.accent` mediante estilo en línea (único caso permitido de color dinámico, porque proviene de datos, no de decisión de diseño).

Crear `src/modules/catalog/ui/ModelsSection.tsx` con `id="modelos"`, encabezado, subtítulo `dictionary.models.subtitle`, rejilla de cuatro columnas en escritorio y dos en móvil, y un enlace final `dictionary.models.seeAll` hacia `/${locale}/colecciones`.

- [ ] **Step 7: Escribir la prueba que falla del carrusel**

Crear `src/modules/catalog/ui/CollectionsCarousel.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import type { Template } from '../domain/template'
import { CollectionsCarousel } from './CollectionsCarousel'

const make = (slug: string, name: string, order: number): Template => ({
  id: slug, slug, categorySlug: 'boda', categoryName: 'Boda',
  coverImagePath: `/templates/${slug}.avif`, palette: { base: '#fff', accent: '#c19b4a' },
  sortOrder: order, name, description: 'x',
})

const templates = [make('perla', 'Perla', 1), make('marmol', 'Mármol', 2), make('laurel', 'Laurel', 3)]

describe('CollectionsCarousel', () => {
  it('expone controles accesibles de navegación', () => {
    render(<CollectionsCarousel templates={templates} dictionary={es} />)
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDefined()
  })

  it('avanza al siguiente elemento y marca el activo', () => {
    render(<CollectionsCarousel templates={templates} dictionary={es} />)
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }))
    expect(screen.getByRole('group', { current: 'true' }).textContent).toContain('Mármol')
  })

  it('no avanza más allá del último elemento', () => {
    render(<CollectionsCarousel templates={templates} dictionary={es} />)
    const next = screen.getByRole('button', { name: /siguiente/i })
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(next)
    expect(screen.getByRole('group', { current: 'true' }).textContent).toContain('Laurel')
  })
})
```

Añadir al diccionario las claves `collections.previous` (`'Anterior'` / `'Previous'`) y `collections.next` (`'Siguiente'` / `'Next'`).

- [ ] **Step 8: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/catalog/ui/CollectionsCarousel.test.tsx`
Expected: FAIL — no existe `./CollectionsCarousel`.

- [ ] **Step 9: Implementar el carrusel**

Crear `src/modules/catalog/ui/CollectionsCarousel.tsx` como Client Component:

```tsx
'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Template } from '../domain/template'
import { TemplateCard } from './TemplateCard'

type Props = { templates: Template[]; dictionary: Dictionary }

export function CollectionsCarousel({ templates, dictionary }: Props) {
  const [index, setIndex] = useState(0)
  const last = Math.max(templates.length - 1, 0)

  const go = (delta: number) => setIndex((current) => Math.min(Math.max(current + delta, 0), last))

  return (
    <div className="relative">
      <motion.ul
        className="flex gap-6"
        animate={{ x: `calc(${-index} * (280px + 24px))` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        drag="x"
        dragConstraints={{ left: -last * 304, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => go(info.offset.x < -60 ? 1 : info.offset.x > 60 ? -1 : 0)}
      >
        {templates.map((template, i) => (
          <li key={template.slug} className="shrink-0" role="group" aria-current={i === index ? 'true' : undefined}>
            <TemplateCard template={template} dictionary={dictionary} />
          </li>
        ))}
      </motion.ul>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] disabled:opacity-40"
          disabled={index === 0}
          onClick={() => go(-1)}
          type="button"
        >
          {dictionary.collections.previous}
        </button>
        <span className="text-[11px] text-ink-mute">{dictionary.collections.hint}</span>
        <button
          className="rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] disabled:opacity-40"
          disabled={index === last}
          onClick={() => go(1)}
          type="button"
        >
          {dictionary.collections.next}
        </button>
      </div>
    </div>
  )
}
```

El arrastre inercial usa `drag` de Framer Motion, no WebGL: cumple el presupuesto de rendimiento y funciona con teclado gracias a los dos botones.

- [ ] **Step 10: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/catalog/ui/CollectionsCarousel.test.tsx`
Expected: PASS, 3 pruebas.

- [ ] **Step 11: Conectar los datos en la página**

Modificar `src/app/[locale]/page.tsx` para cargar catálogo en el servidor y degradar sin romper:

```tsx
import { catalog } from '@/shared/composition/container'
import { isOk } from '@/shared/result'
import { CollectionsCarousel } from '@/modules/catalog/ui/CollectionsCarousel'
import { ModelsSection } from '@/modules/catalog/ui/ModelsSection'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'

export const revalidate = 300

// dentro del componente, tras resolver `locale` y `dictionary`:
const [plansResult, templatesResult] = await Promise.all([catalog.listPlans(locale), catalog.listTemplates(locale)])
const plans = isOk(plansResult) ? plansResult.value : []
const templates = isOk(templatesResult) ? templatesResult.value : []
```

Si el catálogo falla, las secciones correspondientes no se renderizan y el resto de la landing sigue en pie. Registrar el error con `console.error` incluyendo `result.error.detail`.

Orden final de la landing: `HeroSection`, `StatsStrip`, `ExperienceSection`, `MobileSection`, colecciones (`CollectionsCarousel` con `id="colecciones"`), `ComparisonSection`, `PricingSection`, `ModelsSection`, `TestimonialsSection`, `FaqSection`.

- [ ] **Step 12: Crear la página de catálogo completo**

Crear `src/app/[locale]/colecciones/page.tsx`: Server Component que llama `catalog.listTemplates(locale)` y renderiza todas las plantillas en rejilla, con `SectionHeading` y enlace de vuelta a la landing. Si el resultado es error, mostrar un mensaje sobrio con el CTA de WhatsApp, no una pantalla en blanco.

- [ ] **Step 13: Verificar**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat(catalog): secciones de precios, modelos y carrusel de colecciones"
```

---

### Task 11: Hero 3D — sobre con sello de cera

**Files:**
- Create: `src/three/HeroCanvas.tsx`, `src/three/EnvelopeScene.tsx`, `src/three/useSceneCapability.ts`, `src/app/[locale]/hero-slot.tsx`, `public/models/envelope.glb`, `public/hero/envelope-poster.avif`
- Modify: `src/app/[locale]/page.tsx`
- Test: `src/three/useSceneCapability.test.ts`

**Interfaces:**
- Consumes: nada del dominio.
- Produces: `canRenderScene(input: { reducedMotion: boolean; deviceMemory?: number; hasWebGL2: boolean }): boolean`, `HeroCanvas({ posterSrc, alt })` (Client Component que decide entre canvas y póster), `EnvelopeScene` (escena R3F).

- [ ] **Step 1: Instalar dependencias 3D**

```bash
pnpm add three @react-three/fiber @react-three/drei
pnpm add -D @types/three
```

- [ ] **Step 2: Escribir la prueba que falla de capacidad**

Crear `src/three/useSceneCapability.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canRenderScene } from './useSceneCapability'

describe('canRenderScene', () => {
  it('permite la escena en un equipo capaz', () => {
    expect(canRenderScene({ reducedMotion: false, deviceMemory: 8, hasWebGL2: true })).toBe(true)
  })

  it('bloquea cuando el usuario pide movimiento reducido', () => {
    expect(canRenderScene({ reducedMotion: true, deviceMemory: 8, hasWebGL2: true })).toBe(false)
  })

  it('bloquea equipos con menos de 4 GB reportados', () => {
    expect(canRenderScene({ reducedMotion: false, deviceMemory: 2, hasWebGL2: true })).toBe(false)
  })

  it('bloquea sin WebGL2', () => {
    expect(canRenderScene({ reducedMotion: false, deviceMemory: 8, hasWebGL2: false })).toBe(false)
  })

  it('permite cuando el navegador no reporta memoria', () => {
    expect(canRenderScene({ reducedMotion: false, hasWebGL2: true })).toBe(true)
  })
})
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `pnpm test src/three/useSceneCapability.test.ts`
Expected: FAIL — no existe `./useSceneCapability`.

- [ ] **Step 4: Implementar la decisión de capacidad**

Crear `src/three/useSceneCapability.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

export type SceneCapabilityInput = {
  reducedMotion: boolean
  deviceMemory?: number
  hasWebGL2: boolean
}

const MIN_DEVICE_MEMORY_GB = 4

export function canRenderScene({ reducedMotion, deviceMemory, hasWebGL2 }: SceneCapabilityInput): boolean {
  if (reducedMotion) return false
  if (!hasWebGL2) return false
  if (typeof deviceMemory === 'number' && deviceMemory < MIN_DEVICE_MEMORY_GB) return false
  return true
}

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null
  } catch {
    return false
  }
}

export function useSceneCapability(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    setEnabled(canRenderScene({ reducedMotion, deviceMemory, hasWebGL2: detectWebGL2() }))
  }, [])

  return enabled
}
```

El estado inicial es `false`: el servidor y el primer pintado entregan el póster, así el LCP nunca depende de WebGL.

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `pnpm test src/three/useSceneCapability.test.ts`
Expected: PASS, 5 pruebas.

- [ ] **Step 6: Preparar el modelo y el póster**

El GLB del sobre no existe todavía. Producirlo así:

```bash
mkdir -p public/models public/hero
# 1. Modelar o adquirir un sobre cerrado con solapa y sello circular.
# 2. Comprimir con Draco antes de publicarlo:
pnpm dlx gltf-pipeline -i envelope-raw.glb -o public/models/envelope.glb -d --draco.compressionLevel 7
du -h public/models/envelope.glb   # debe quedar por debajo de 900 KB
```

Mientras el modelo definitivo no exista, la escena usa geometría primitiva: dos `<boxGeometry>` para cuerpo y solapa más un `<cylinderGeometry>` achatado para el sello, con `MeshPhysicalMaterial` (`roughness: 0.75` en el papel, `metalness: 0.9` y `clearcoat: 1` en el sello dorado `#c19b4a`). Esto ya es entregable; sustituir por el GLB no cambia la interfaz de `EnvelopeScene`.

Generar el póster capturando el primer fotograma de la escena a 1400×1000 y guardándolo como `public/hero/envelope-poster.avif` con calidad 60.

- [ ] **Step 7: Implementar la escena**

Crear `src/three/EnvelopeScene.tsx`:

```tsx
'use client'

import { Environment, PresentationControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'

function Envelope() {
  const flap = useRef<Group>(null)
  const [open, setOpen] = useState(false)

  useFrame((_, delta) => {
    if (!flap.current) return
    const target = open ? -Math.PI * 0.85 : 0
    flap.current.rotation.x += (target - flap.current.rotation.x) * Math.min(delta * 3, 1)
  })

  return (
    <group onClick={() => setOpen((v) => !v)}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3, 2, 0.06]} />
        <meshPhysicalMaterial color="#fdfaf4" roughness={0.75} sheen={0.4} sheenColor="#e2c584" />
      </mesh>

      <group ref={flap} position={[0, 1, 0.03]}>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[3, 1, 0.04]} />
          <meshPhysicalMaterial color="#f6f1e9" roughness={0.7} />
        </mesh>
      </group>

      <mesh position={[0, 0.05, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 48]} />
        <meshPhysicalMaterial color="#c19b4a" metalness={0.9} roughness={0.25} clearcoat={1} />
      </mesh>
    </group>
  )
}

export default function EnvelopeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 5.4], fov: 38 }}
      dpr={[1, 1.75]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows
    >
      <ambientLight intensity={0.7} />
      <directionalLight castShadow intensity={1.15} position={[3, 4, 3]} />
      <PresentationControls polar={[-0.15, 0.25]} azimuth={[-0.4, 0.4]} snap>
        <Envelope />
      </PresentationControls>
      <Environment preset="studio" />
    </Canvas>
  )
}
```

Exportación por defecto para poder cargarla con `next/dynamic`.

- [ ] **Step 8: Implementar el envoltorio con póster**

Crear `src/three/HeroCanvas.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Suspense } from 'react'
import { useSceneCapability } from './useSceneCapability'

const EnvelopeScene = dynamic(() => import('./EnvelopeScene'), { ssr: false })

type Props = { posterSrc: string; alt: string }

export function HeroCanvas({ posterSrc, alt }: Props) {
  const enabled = useSceneCapability()

  const poster = (
    <Image
      alt={alt}
      className="h-full w-full rounded-[var(--radius-card)] object-cover"
      height={1000}
      priority
      sizes="(max-width: 1024px) 90vw, 520px"
      src={posterSrc}
      width={1400}
    />
  )

  if (!enabled) return <div className="h-full min-h-[420px]">{poster}</div>

  return (
    <div className="h-full min-h-[420px]">
      <Suspense fallback={poster}>
        <EnvelopeScene />
      </Suspense>
    </div>
  )
}
```

El póster lleva `priority` porque es el candidato a LCP.

- [ ] **Step 9: Inyectar la escena en el hero**

Modificar `src/app/[locale]/page.tsx` para pasar el canvas como `slot`:

```tsx
<HeroSection
  dictionary={dictionary}
  slot={<HeroCanvas posterSrc="/hero/envelope-poster.avif" alt={dictionary.hero.posterAlt} />}
/>
```

Añadir `hero.posterAlt` al diccionario: `'Sobre de algodón con sello de cera dorado, cerrado sobre fondo marfil'` / `'Cotton envelope with a golden wax seal, closed on an ivory background'`.

- [ ] **Step 10: Medir el presupuesto**

```bash
pnpm build
pnpm dlx @lhci/cli autorun --collect.url=http://localhost:3000/es --collect.startServerCommand="pnpm start"
```

Expected: LCP < 2.0 s y CLS < 0.05 en el perfil móvil. Si el LCP supera el umbral, verificar que el póster llega con `priority` y que `EnvelopeScene` no está en el bundle inicial (`pnpm build` debe mostrar el chunk de `three` como carga diferida).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(3d): hero con sobre interactivo, póster de respaldo y degradación por capacidad"
```

---

### Task 12: Captación de leads y salida a WhatsApp

**Files:**
- Create: `src/modules/leads/domain/consultation.ts`, `src/modules/leads/domain/errors.ts`, `src/modules/leads/application/ports.ts`, `src/modules/leads/application/submit-consultation.ts`, `src/modules/leads/infrastructure/drizzle-consultation-repository.ts`, `src/modules/leads/infrastructure/whatsapp-link.ts`, `src/modules/leads/ui/ConsultationForm.tsx`, `src/modules/leads/ui/ContactSection.tsx`, `src/modules/leads/actions.ts`, `src/modules/leads/index.ts`
- Modify: `src/shared/composition/container.ts`, `src/app/[locale]/page.tsx`, `src/modules/catalog/ui/PlanCard.tsx`
- Test: `src/modules/leads/domain/consultation.test.ts`, `src/modules/leads/application/submit-consultation.test.ts`, `src/modules/leads/infrastructure/whatsapp-link.test.ts`

**Interfaces:**
- Consumes: `Result`, `Locale`, `db`, `BRAND`, `Plan`.
- Produces:
  - `consultationSchema` (Zod) y `type ConsultationInput = z.infer<typeof consultationSchema>`
  - `createConsultation(input: ConsultationInput, now: Date): Result<Consultation, LeadError>`
  - `interface ConsultationRepository { save(consultation: Consultation): Promise<void> }`
  - `submitConsultation(deps: { requests: ConsultationRepository; clock: () => Date }): (input: unknown) => Promise<Result<{ id: string }, LeadError>>`
  - `buildWhatsAppLink(input: { message: string }): string`
  - `whatsAppPlanMessage(plan: { name: string; price: string }, locale: Locale): string`

- [ ] **Step 1: Escribir la prueba que falla del dominio**

Crear `src/modules/leads/domain/consultation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createConsultation } from './consultation'

const now = new Date('2026-08-18T12:00:00Z')

const base = {
  name: 'María Rojas',
  email: 'maria@example.com',
  phone: '',
  categorySlug: 'boda',
  eventDate: '2026-12-05',
  message: 'Boda en Cochabamba',
  locale: 'es' as const,
}

describe('createConsultation', () => {
  it('acepta una consulta con email', () => {
    expect(isOk(createConsultation(base, now))).toBe(true)
  })

  it('acepta una consulta solo con teléfono', () => {
    const result = createConsultation({ ...base, email: '', phone: '+591 700 11223' }, now)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.phone).toBe('+59170011223')
  })

  it('rechaza una consulta sin ningún contacto', () => {
    const result = createConsultation({ ...base, email: '', phone: '' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('missing_contact')
  })

  it('rechaza un nombre vacío', () => {
    const result = createConsultation({ ...base, name: '   ' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_name')
  })

  it('rechaza una fecha de evento en el pasado', () => {
    const result = createConsultation({ ...base, eventDate: '2026-08-17' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('past_event_date')
  })

  it('acepta una consulta sin fecha', () => {
    expect(isOk(createConsultation({ ...base, eventDate: '' }, now))).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/leads/domain/consultation.test.ts`
Expected: FAIL — no existe `./consultation`.

- [ ] **Step 3: Implementar el dominio**

Crear `src/modules/leads/domain/errors.ts`:

```ts
export type LeadErrorKind = 'invalid_name' | 'missing_contact' | 'invalid_email' | 'past_event_date' | 'invalid_payload' | 'rate_limited' | 'storage_failure'

export type LeadError = { readonly kind: LeadErrorKind; readonly detail: string }

export const leadError = (kind: LeadErrorKind, detail: string): LeadError => ({ kind, detail })
```

Crear `src/modules/leads/domain/consultation.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import { leadError, type LeadError } from './errors'

export type ConsultationInput = {
  name: string
  email: string
  phone: string
  categorySlug: string
  eventDate: string
  message: string
  locale: Locale
}

export type Consultation = {
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly categorySlug: string | null
  readonly eventDate: string | null
  readonly message: string | null
  readonly locale: Locale
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const normalizePhone = (raw: string): string => raw.replace(/[^\d+]/g, '')

export function createConsultation(input: ConsultationInput, now: Date): Result<Consultation, LeadError> {
  const name = input.name.trim()
  if (name.length < 2) return err(leadError('invalid_name', 'El nombre es obligatorio'))

  const email = input.email.trim()
  const phone = normalizePhone(input.phone.trim())

  if (email.length === 0 && phone.length === 0) {
    return err(leadError('missing_contact', 'Se requiere email o teléfono'))
  }
  if (email.length > 0 && !EMAIL_PATTERN.test(email)) {
    return err(leadError('invalid_email', `Email inválido: ${email}`))
  }

  const eventDate = input.eventDate.trim()
  if (eventDate.length > 0) {
    const parsed = new Date(`${eventDate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) return err(leadError('past_event_date', 'Fecha inválida'))
    const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`)
    if (parsed.getTime() < today.getTime()) {
      return err(leadError('past_event_date', 'La fecha del evento ya pasó'))
    }
  }

  return ok({
    name,
    email: email.length > 0 ? email.toLowerCase() : null,
    phone: phone.length > 0 ? phone : null,
    categorySlug: input.categorySlug.trim() || null,
    eventDate: eventDate.length > 0 ? eventDate : null,
    message: input.message.trim() || null,
    locale: input.locale,
  })
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/leads/domain/consultation.test.ts`
Expected: PASS, 6 pruebas.

- [ ] **Step 5: Escribir la prueba que falla del caso de uso**

Crear `src/modules/leads/application/submit-consultation.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { Consultation } from '../domain/consultation'
import { submitConsultation } from './submit-consultation'

const clock = () => new Date('2026-08-18T12:00:00Z')

const payload = {
  name: 'María Rojas',
  email: 'maria@example.com',
  phone: '',
  categorySlug: 'boda',
  eventDate: '2026-12-05',
  message: 'Boda en Cochabamba',
  locale: 'es',
}

describe('submitConsultation', () => {
  it('guarda una consulta válida', async () => {
    const saved: Consultation[] = []
    const result = await submitConsultation({
      requests: { save: async (c) => { saved.push(c); return } },
      clock,
    })(payload)

    expect(isOk(result)).toBe(true)
    expect(saved).toHaveLength(1)
    expect(saved[0]?.email).toBe('maria@example.com')
  })

  it('rechaza un payload con forma inválida sin tocar el repositorio', async () => {
    const save = vi.fn()
    const result = await submitConsultation({ requests: { save }, clock })({ name: 42 })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_payload')
    expect(save).not.toHaveBeenCalled()
  })

  it('convierte un fallo del repositorio en storage_failure', async () => {
    const result = await submitConsultation({
      requests: { save: async () => { throw new Error('conexión caída') } },
      clock,
    })(payload)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('storage_failure')
  })
})
```

- [ ] **Step 6: Ejecutar y verificar que falla**

Run: `pnpm test src/modules/leads/application/submit-consultation.test.ts`
Expected: FAIL — no existe `./submit-consultation`.

- [ ] **Step 7: Implementar puertos y caso de uso**

Crear `src/modules/leads/application/ports.ts`:

```ts
import type { Consultation } from '../domain/consultation'

export interface ConsultationRepository {
  save(consultation: Consultation): Promise<void>
}
```

Crear `src/modules/leads/application/submit-consultation.ts`:

```ts
import { z } from 'zod'
import { err, isErr, ok, type Result } from '@/shared/result'
import { LOCALES } from '@/shared/i18n/locales'
import { createConsultation } from '../domain/consultation'
import { leadError, type LeadError } from '../domain/errors'
import type { ConsultationRepository } from './ports'

export const consultationSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().max(200).default(''),
  phone: z.string().max(32).default(''),
  categorySlug: z.string().max(64).default(''),
  eventDate: z.string().max(10).default(''),
  message: z.string().max(2000).default(''),
  locale: z.enum(LOCALES),
})

export const submitConsultation =
  (deps: { requests: ConsultationRepository; clock: () => Date }) =>
  async (payload: unknown): Promise<Result<{ ok: true }, LeadError>> => {
    const parsed = consultationSchema.safeParse(payload)
    if (!parsed.success) {
      return err(leadError('invalid_payload', parsed.error.issues.map((i) => i.path.join('.')).join(', ')))
    }

    const consultation = createConsultation(parsed.data, deps.clock())
    if (isErr(consultation)) return consultation

    try {
      await deps.requests.save(consultation.value)
    } catch (cause) {
      return err(leadError('storage_failure', cause instanceof Error ? cause.message : 'error desconocido'))
    }

    return ok({ ok: true })
  }
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/leads/application/submit-consultation.test.ts`
Expected: PASS, 3 pruebas.

- [ ] **Step 9: Escribir la prueba que falla del enlace de WhatsApp**

Crear `src/modules/leads/infrastructure/whatsapp-link.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildWhatsAppLink, whatsAppPlanMessage } from './whatsapp-link'

describe('buildWhatsAppLink', () => {
  it('usa el número de marca sin signos', () => {
    expect(buildWhatsAppLink({ message: 'Hola' })).toBe('https://wa.me/59170012345?text=Hola')
  })

  it('codifica caracteres especiales', () => {
    const link = buildWhatsAppLink({ message: 'Plan Firma 3D — Bs 1.450' })
    expect(link).toContain('Plan%20Firma%203D')
    expect(link).not.toContain(' ')
  })
})

describe('whatsAppPlanMessage', () => {
  it('menciona el plan y el precio en español', () => {
    const message = whatsAppPlanMessage({ name: 'Firma 3D', price: 'Bs 1.450' }, 'es')
    expect(message).toContain('Firma 3D')
    expect(message).toContain('Bs 1.450')
  })

  it('cambia el idioma del mensaje', () => {
    expect(whatsAppPlanMessage({ name: 'Signature 3D', price: 'Bs 1,450' }, 'en')).toMatch(/^Hello/)
  })
})
```

- [ ] **Step 10: Implementar el enlace**

Crear `src/modules/leads/infrastructure/whatsapp-link.ts`:

```ts
import { BRAND } from '@/shared/config/brand'
import type { Locale } from '@/shared/i18n/locales'

const digitsOnly = (value: string): string => value.replace(/\D/g, '')

export function buildWhatsAppLink({ message }: { message: string }): string {
  return `https://wa.me/${digitsOnly(BRAND.whatsapp)}?text=${encodeURIComponent(message)}`
}

export function whatsAppPlanMessage(plan: { name: string; price: string }, locale: Locale): string {
  return locale === 'es'
    ? `Hola, quiero la invitación del plan ${plan.name} (${plan.price}). ¿Me cuentan los siguientes pasos?`
    : `Hello, I'd like the ${plan.name} invitation plan (${plan.price}). Could you walk me through the next steps?`
}
```

- [ ] **Step 11: Ejecutar y verificar que pasa**

Run: `pnpm test src/modules/leads/infrastructure/whatsapp-link.test.ts`
Expected: PASS, 4 pruebas.

- [ ] **Step 12: Implementar el repositorio y la Server Action**

Crear `src/modules/leads/infrastructure/drizzle-consultation-repository.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { consultationRequests, eventCategories } from '@/shared/db/schema'
import type { Consultation } from '../domain/consultation'
import type { ConsultationRepository } from '../application/ports'

export const drizzleConsultationRepository: ConsultationRepository = {
  async save(consultation: Consultation): Promise<void> {
    let categoryId: string | null = null

    if (consultation.categorySlug) {
      const [category] = await db
        .select({ id: eventCategories.id })
        .from(eventCategories)
        .where(eq(eventCategories.slug, consultation.categorySlug))
        .limit(1)
      categoryId = category?.id ?? null
    }

    await db.insert(consultationRequests).values({
      name: consultation.name,
      email: consultation.email,
      phone: consultation.phone,
      categoryId,
      eventDate: consultation.eventDate,
      message: consultation.message,
      locale: consultation.locale,
    })
  },
}
```

Crear `src/modules/leads/actions.ts`:

```ts
'use server'

import { headers } from 'next/headers'
import { leads } from '@/shared/composition/container'
import { isErr } from '@/shared/result'

type ActionState = { status: 'idle' | 'success' | 'error'; message: string }

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 3
const attempts = new Map<string, number[]>()

function rateLimited(key: string, now: number): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  attempts.set(key, [...recent, now])
  return recent.length >= MAX_PER_WINDOW
}

export async function submitConsultationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const headerBag = await headers()
  const ip = headerBag.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconocida'

  if (rateLimited(ip, Date.now())) {
    return { status: 'error', message: 'too_many_requests' }
  }

  const result = await leads.submitConsultation(Object.fromEntries(formData))

  if (isErr(result)) {
    console.error('consulta rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  return { status: 'success', message: 'ok' }
}
```

El limitador en memoria basta para un solo contenedor; el Plan B lo mueve a Postgres cuando haya más de una réplica. La acción nunca devuelve `detail` al cliente: solo el `kind`, que la UI traduce.

Extender `src/shared/composition/container.ts`:

```ts
import { submitConsultation } from '@/modules/leads/application/submit-consultation'
import { drizzleConsultationRepository } from '@/modules/leads/infrastructure/drizzle-consultation-repository'

export const leads = {
  submitConsultation: submitConsultation({ requests: drizzleConsultationRepository, clock: () => new Date() }),
} as const
```

- [ ] **Step 13: Implementar el formulario y la sección de contacto**

Crear `src/modules/leads/ui/ConsultationForm.tsx` como Client Component con `useActionState(submitConsultationAction, { status: 'idle', message: '' })`:

- Campos: `name`, `email`, `phone`, `categorySlug` (select con las categorías recibidas por props), `eventDate` (`type="date"`), `message` (textarea), y un `input type="hidden" name="locale"`.
- Cada campo con `<label>` asociado por `htmlFor`, y `aria-describedby` al mensaje de error cuando lo haya.
- Botón de envío deshabilitado mientras `isPending`.
- En `status === 'success'`, reemplazar el formulario por `contact.successTitle` + `contact.successBody` + botón `contact.again` que reinicia el estado.
- En `status === 'error'`, mostrar el texto del diccionario correspondiente al `kind` recibido. Añadir al diccionario la clave `contact.errors` con entradas para `invalid_payload`, `missing_contact`, `invalid_email`, `invalid_name`, `past_event_date`, `storage_failure` y `too_many_requests`.

Crear `src/modules/leads/ui/ContactSection.tsx` con `id="contacto"`: columna izquierda con `eyebrow`, `title`, `body`, el WhatsApp (`BRAND.whatsappDisplay`, enlazado con `buildWhatsAppLink`) y el email; columna derecha con `ConsultationForm` dentro de un `GlassPanel`.

Crear `src/modules/leads/index.ts` exportando `ContactSection`, `buildWhatsAppLink`, `whatsAppPlanMessage` y los tipos públicos.

- [ ] **Step 14: Conectar los CTA de precios a WhatsApp**

Modificar `PricingSection` para calcular, por plan, `buildWhatsAppLink({ message: whatsAppPlanMessage({ name: plan.name, price: formatMoney(plan.price, locale) }, locale) })` y pasarlo como `ctaHref` a `PlanCard`, con `external` activo en el botón. Añadir la prop `ctaExternal?: boolean` a `PlanCard` y propagarla a `Button`.

Modificar `src/app/[locale]/page.tsx` para renderizar `ContactSection` al final, pasándole las categorías. Para obtenerlas, añadir al catálogo un caso de uso `listCategories` con su repositorio (misma forma que `listTemplates`, leyendo `event_categories` con su traducción) y exponerlo en el contenedor.

- [ ] **Step 15: Verificar de punta a punta**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5432/invite SITE_URL=http://localhost:3000 pnpm dev
```

Enviar el formulario desde el navegador y comprobar la fila:

```bash
docker exec -i $(docker compose -f docker/compose.dev.yml ps -q db) \
  psql -U invite -d invite -c "select name, email, locale, created_at from consultation_requests order by created_at desc limit 1;"
```

Expected: aparece la consulta recién enviada. Enviar cuatro veces seguidas debe devolver el mensaje de `too_many_requests` en el cuarto intento.

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "feat(leads): consulta validada, persistencia y enlaces de WhatsApp por plan"
```

---

### Task 13: SEO técnico y datos estructurados

**Files:**
- Create: `src/shared/seo/metadata.ts`, `src/shared/seo/json-ld.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/[locale]/opengraph-image.tsx`
- Modify: `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/colecciones/page.tsx`
- Test: `src/shared/seo/metadata.test.ts`, `src/shared/seo/json-ld.test.ts`

**Interfaces:**
- Consumes: `env.SITE_URL`, `BRAND`, `Dictionary`, `Plan`, `Template`.
- Produces:
  - `buildAlternates(path: string): { canonical: string; languages: Record<string, string> }`
  - `buildPageMetadata(input: { locale: Locale; path: string; title: string; description: string }): Metadata`
  - `organizationJsonLd()`, `productJsonLd(plans: Plan[], locale: Locale)`, `faqJsonLd(dictionary: Dictionary)`, `breadcrumbJsonLd(items: { name: string; url: string }[])`

- [ ] **Step 1: Escribir la prueba que falla de alternates**

Crear `src/shared/seo/metadata.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildAlternates } from './metadata'

describe('buildAlternates', () => {
  it('genera canonical por idioma y x-default en inglés', () => {
    const alternates = buildAlternates('/es/colecciones')
    expect(alternates.canonical).toBe('https://invitepremium.bo/es/colecciones')
    expect(alternates.languages['es']).toBe('https://invitepremium.bo/es/colecciones')
    expect(alternates.languages['en']).toBe('https://invitepremium.bo/en/colecciones')
    expect(alternates.languages['x-default']).toBe('https://invitepremium.bo/en/colecciones')
  })

  it('funciona en la raíz de cada idioma', () => {
    const alternates = buildAlternates('/en')
    expect(alternates.canonical).toBe('https://invitepremium.bo/en')
    expect(alternates.languages['es']).toBe('https://invitepremium.bo/es')
  })
})
```

Ejecutar con `SITE_URL=https://invitepremium.bo` en el entorno de la prueba.

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `SITE_URL=https://invitepremium.bo DATABASE_URL=postgres://x pnpm test src/shared/seo/metadata.test.ts`
Expected: FAIL — no existe `./metadata`.

- [ ] **Step 3: Implementar metadatos**

Crear `src/shared/seo/metadata.ts`:

```ts
import type { Metadata } from 'next'
import { env } from '@/shared/config/env'
import { BRAND } from '@/shared/config/brand'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/shared/i18n/locales'

const stripLocale = (path: string): string => {
  const segments = path.split('/').filter(Boolean)
  const [first, ...rest] = segments
  return first && (LOCALES as readonly string[]).includes(first) ? `/${rest.join('/')}` : path
}

export function buildAlternates(path: string) {
  const rest = stripLocale(path).replace(/\/$/, '')
  const url = (locale: Locale) => `${env.SITE_URL}/${locale}${rest}`
  const current = path.startsWith('/') ? `${env.SITE_URL}${path}` : `${env.SITE_URL}/${path}`

  return {
    canonical: current.replace(/\/$/, ''),
    languages: {
      es: url('es'),
      en: url('en'),
      'x-default': url(DEFAULT_LOCALE),
    } as Record<string, string>,
  }
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale
  path: string
  title: string
  description: string
}): Metadata {
  const alternates = buildAlternates(path)

  return {
    title,
    description,
    alternates,
    metadataBase: new URL(env.SITE_URL),
    openGraph: {
      type: 'website',
      siteName: BRAND.siteName,
      locale: locale === 'es' ? 'es_BO' : 'en_US',
      title,
      description,
      url: alternates.canonical,
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  }
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `SITE_URL=https://invitepremium.bo DATABASE_URL=postgres://x pnpm test src/shared/seo/metadata.test.ts`
Expected: PASS, 2 pruebas.

- [ ] **Step 5: Escribir la prueba que falla de JSON-LD**

Crear `src/shared/seo/json-ld.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Plan } from '@/modules/catalog'
import { faqJsonLd, productJsonLd } from './json-ld'
import { es } from '@/shared/i18n/messages/es'

const plans: Plan[] = [
  {
    id: '1', slug: 'atelier', price: { cents: 69000, currency: 'BOB' }, highlighted: false, sortOrder: 1,
    name: 'Atelier', tagline: 'Esencia elegante', description: 'Una escena.', features: ['Sobre animado'],
  },
]

describe('productJsonLd', () => {
  it('publica precio en unidades y moneda BOB', () => {
    const [product] = productJsonLd(plans, 'es')
    expect(product?.['@type']).toBe('Product')
    expect(product?.offers.price).toBe('690.00')
    expect(product?.offers.priceCurrency).toBe('BOB')
  })
})

describe('faqJsonLd', () => {
  it('incluye una entrada por pregunta', () => {
    const faq = faqJsonLd(es)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(es.faq.items.length)
  })
})
```

- [ ] **Step 6: Implementar JSON-LD**

Crear `src/shared/seo/json-ld.ts` con funciones puras que devuelven objetos planos (nunca cadenas HTML). `productJsonLd` convierte centavos a unidades con dos decimales y añade `availability: 'https://schema.org/InStock'` y `url` del ancla de precios. `organizationJsonLd` usa `BRAND` y `env.SITE_URL`. `breadcrumbJsonLd` genera `ListItem` con `position` desde 1.

Renderizar cada bloque con:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()).replace(/</g, '\\u003c') }}
/>
```

El reemplazo de `<` impide que un dato con etiquetas cierre el script.

- [ ] **Step 7: Ejecutar y verificar que pasa**

Run: `SITE_URL=https://invitepremium.bo DATABASE_URL=postgres://x pnpm test src/shared/seo/json-ld.test.ts`
Expected: PASS, 2 pruebas.

- [ ] **Step 8: Añadir sitemap y robots**

Crear `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { catalog } from '@/shared/composition/container'
import { env } from '@/shared/config/env'
import { LOCALES } from '@/shared/i18n/locales'
import { isOk } from '@/shared/result'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    entries.push({ url: `${env.SITE_URL}/${locale}`, changeFrequency: 'weekly', priority: 1 })
    entries.push({ url: `${env.SITE_URL}/${locale}/colecciones`, changeFrequency: 'weekly', priority: 0.8 })

    const templates = await catalog.listTemplates(locale)
    if (isOk(templates)) {
      for (const template of templates.value) {
        entries.push({ url: `${env.SITE_URL}/${locale}/colecciones/${template.slug}`, priority: 0.6 })
      }
    }
  }

  return entries
}
```

Crear `src/app/robots.ts` que permita todo salvo `/admin` y `/api`, y apunte a `${env.SITE_URL}/sitemap.xml`.

- [ ] **Step 9: Aplicar metadatos a las páginas**

En `src/app/[locale]/page.tsx` exportar `generateMetadata` usando `buildPageMetadata` con el título orientado a intención de compra:

- es: `Invitaciones digitales de lujo y 3D interactivas | InvitePremium`
- en: `Luxury 3D digital wedding invitations | InvitePremium`

La descripción sale de `dictionary.hero.body` recortada a 155 caracteres. Repetir el patrón en `colecciones/page.tsx` con sus propios textos (`dictionary.collections.*`).

Crear `src/app/[locale]/opengraph-image.tsx` con el runtime de imagen de Next: fondo `#f6f1e9`, `LUXE` en Cormorant y el título de la página, tamaño 1200×630.

- [ ] **Step 10: Verificar la salida real**

```bash
pnpm build && SITE_URL=https://invitepremium.bo DATABASE_URL=postgres://invite:invite@localhost:5432/invite pnpm start &
curl -s http://localhost:3000/es | grep -o 'hreflang="[^"]*"' | sort -u
curl -s http://localhost:3000/es | grep -o 'application/ld+json' | wc -l
curl -s http://localhost:3000/sitemap.xml | head -20
```

Expected: tres `hreflang` (`es`, `en`, `x-default`), al menos tres bloques JSON-LD y un sitemap con ambas ramas de idioma.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(seo): metadatos por idioma, hreflang, JSON-LD y sitemap"
```

---

### Task 14: Empaquetado, despliegue en VPS y pruebas de extremo a extremo

**Files:**
- Create: `docker/Dockerfile`, `docker/compose.yml`, `docker/Caddyfile`, `docker/backup.sh`, `tests/e2e/landing.spec.ts`, `playwright.config.ts`, `.dockerignore`, `docs/despliegue.md`
- Modify: `next.config.ts`, `package.json`

**Interfaces:**
- Consumes: toda la app.
- Produces: imagen Docker `invitepremium-web`, `docker compose -f docker/compose.yml up -d` funcionando, y `pnpm test:e2e`.

- [ ] **Step 1: Activar la salida standalone**

Modificar `next.config.ts`:

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
```

- [ ] **Step 2: Escribir el Dockerfile**

Crear `docker/Dockerfile`:

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/db ./db
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Crear `.dockerignore` con `node_modules`, `.next`, `.git`, `docs`, `tests`, `*.md`, `.env*`.

- [ ] **Step 3: Escribir el compose de producción**

Crear `docker/compose.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 10

  web:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      SITE_URL: ${SITE_URL}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    expose:
      - '3000'

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web

  backup:
    image: postgres:17-alpine
    restart: unless-stopped
    entrypoint: ['/bin/sh', '/backup.sh']
    environment:
      PGUSER: ${POSTGRES_USER}
      PGPASSWORD: ${POSTGRES_PASSWORD}
      PGDATABASE: ${POSTGRES_DB}
      PGHOST: db
    volumes:
      - ./backup.sh:/backup.sh:ro
      - backups:/backups
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
  backups:
  caddy_data:
  caddy_config:
```

Crear `docker/Caddyfile`:

```
{$SITE_DOMAIN} {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		-Server
	}
	reverse_proxy web:3000
}
```

Crear `docker/backup.sh`:

```sh
#!/bin/sh
set -eu
mkdir -p /backups
while true; do
  stamp=$(date -u +%Y%m%d-%H%M)
  pg_dump --format=custom --file="/backups/invite-${stamp}.dump"
  find /backups -name 'invite-*.dump' -mtime +14 -delete
  echo "respaldo listo: invite-${stamp}.dump"
  sleep 86400
done
```

- [ ] **Step 4: Aplicar migraciones en el arranque**

Añadir a `package.json`:

```json
{
  "start": "node -e \"require('child_process').execSync('pnpm db:migrate', {stdio:'inherit'})\" && node server.js"
}
```

En el contenedor, el arranque real lo hace `CMD`; para mantenerlo simple y explícito, ejecutar las migraciones como paso de despliegue documentado:

```bash
docker compose -f docker/compose.yml run --rm web node -e "" # no-op de verificación
docker compose -f docker/compose.yml exec web sh -c 'DATABASE_URL=$DATABASE_URL npx drizzle-kit migrate'
```

Documentar ambos comandos en `docs/despliegue.md` junto con el seed inicial.

- [ ] **Step 5: Escribir las pruebas de extremo a extremo**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

Crear `playwright.config.ts` apuntando a `http://localhost:3000`, con `webServer` que ejecute `pnpm start`.

Crear `tests/e2e/landing.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('redirige a español según la cabecera del navegador', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-BO', extraHTTPHeaders: { 'Accept-Language': 'es-BO,es;q=0.9' } })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/es$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('cae a inglés con un idioma no soportado', async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9' } })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/en$/)
})

test('muestra los tres planes con precios en bolivianos', async ({ page }) => {
  await page.goto('/es')
  await expect(page.getByText('Bs 690')).toBeVisible()
  await expect(page.getByText('Bs 1.450')).toBeVisible()
  await expect(page.getByText('Bs 2.900')).toBeVisible()
})

test('el CTA de un plan lleva a WhatsApp con el mensaje correcto', async ({ page }) => {
  await page.goto('/es')
  const cta = page.getByRole('link', { name: 'Firma 3D' }).first()
  await expect(cta).toHaveAttribute('href', /wa\.me\/59170012345\?text=.*Firma%203D/)
})

test('envía una consulta y muestra la confirmación', async ({ page }) => {
  await page.goto('/es#contacto')
  await page.getByLabel('Nombre').fill('María Rojas')
  await page.getByLabel('WhatsApp o email').fill('maria@example.com')
  await page.getByRole('button', { name: 'Solicitar consulta' }).click()
  await expect(page.getByText('Solicitud recibida')).toBeVisible()
})
```

Añadir a `package.json`: `"test:e2e": "playwright test"`.

- [ ] **Step 6: Ejecutar las pruebas de extremo a extremo**

Run:

```bash
docker compose -f docker/compose.dev.yml up -d
DATABASE_URL=postgres://invite:invite@localhost:5432/invite SITE_URL=http://localhost:3000 pnpm build
DATABASE_URL=postgres://invite:invite@localhost:5432/invite SITE_URL=http://localhost:3000 pnpm test:e2e
```

Expected: 5 pruebas en verde.

- [ ] **Step 7: Documentar el despliegue**

Crear `docs/despliegue.md` con: requisitos del VPS, creación de `.env` de producción (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `SITE_URL`, `SITE_DOMAIN`), apuntado del DNS al VPS, `docker compose -f docker/compose.yml up -d --build`, aplicación de migraciones, seed inicial, verificación de TLS, y restauración de un respaldo con `pg_restore`.

- [ ] **Step 8: Verificar el arranque completo en local**

```bash
cd docker
SITE_DOMAIN=localhost SITE_URL=http://localhost POSTGRES_USER=invite POSTGRES_PASSWORD=invite POSTGRES_DB=invite \
  docker compose -f compose.yml up -d --build
docker compose -f compose.yml ps
curl -sI http://localhost | head -3
```

Expected: los cuatro servicios arriba y respuesta 200 o 307 desde Caddy.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: empaquetado Docker, Caddy con TLS, respaldos y pruebas e2e"
```

---

## Autorevisión del plan

**Cobertura del spec:**

| Sección del spec | Tarea |
|---|---|
| 3 Arquitectura modular | 1, 7 |
| 4 Modelo de dominio (catálogo) | 6 |
| 4 Modelo de dominio (leads) | 12 |
| 4 Órdenes, comprobantes, admin | **Plan B** |
| 5 Esquema Postgres | 5 |
| 6 Rutas, i18n | 3, 8 |
| 6 SEO y JSON-LD | 13 |
| 7 Sistema de diseño | 4 |
| 8 Hero 3D | 11 |
| 9 Pedidos y comprobantes | **Plan B** |
| 10 Manejo de errores | 1 (Result), 12 (mapeo en acción), 10 (degradación de catálogo) |
| 11 Pruebas | 1, 5, 14 |
| 12 Despliegue | 14 |

**Alcance excluido a propósito:** las secciones 9 y la parte de órdenes/admin de la sección 4 del spec pertenecen al Plan B, que se escribe cuando el Plan A esté desplegado.

**Consistencia de tipos verificada:** `Locale`, `Result`, `CatalogError`, `LeadError`, `Plan`, `Template`, `Money`, `PlanRepository`, `TemplateRepository`, `ConsultationRepository` se usan con la misma firma en todas las tareas. El contenedor expone `catalog` (Task 7) y `leads` (Task 12).

**Riesgos conocidos:**

1. El separador de miles de `es-BO` en Node 22 debe fijarse en las Tasks 6, 10 y 14 con el mismo valor; si difiere de `1.450`, actualizar las tres.
2. El GLB definitivo del sobre no existe: la Task 11 entrega geometría primitiva y deja el reemplazo como sustitución directa.
3. Las imágenes de plantillas dependen de `uploads/`; si falta alguna, generar un marcador con la paleta de la plantilla en lugar de dejar un hueco.
