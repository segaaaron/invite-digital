# Motor de invitaciones y RSVP — Rebanada 1 (núcleo) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el atelier cree un evento, cargue grupos de invitados con cupos y obtenga un enlace por grupo; que el invitado confirme desde ese enlace sin cuenta; y que el atelier y el cliente vean los contadores en vivo.

**Architecture:** cuatro módulos nuevos (`identity`, `events`, `guests`, `rsvp`) con las mismas capas y fronteras ESLint que `catalog` y `leads`: `domain` puro, `application` con puertos, `infrastructure` con Drizzle, `ui` con componentes. La composición sigue en `src/app/composition/container.ts`, por argumento, sin contenedor DI. Tres raíces de layout por grupo de rutas: sitio público con idioma, panel del atelier y páginas de invitado.

**Tech Stack:** Next 16 (App Router, Server Actions), TypeScript strict con `noUncheckedIndexedAccess`, Drizzle ORM sobre Postgres 17, Vitest (proyectos `node` y `jsdom`), Playwright, `@node-rs/argon2`, Tailwind con los tokens de `src/shared/design/tokens.css`.

**Spec:** `docs/superpowers/specs/2026-08-19-invitation-engine-design.md`

## Restricciones globales

- **pnpm exclusivamente.** Nunca npm ni yarn.
- TypeScript strict con `noUncheckedIndexedAccess`. Prohibido `any` y `@ts-ignore`.
- Ningún color hexadecimal fuera de `src/shared/design/tokens.css`.
- Fronteras ESLint (`eslint.config.mjs`): `domain` solo importa `domain` y `shared`; `application` nunca importa `infrastructure`; `shared` solo importa `shared`; solo `app` importa `infrastructure`. **No relajar la política**: si algo no compila por la frontera, el archivo está mal ubicado.
- Toda clave de diccionario nueva se declara en `src/shared/i18n/dictionary.ts` Y en `es.ts` Y en `en.ts`, en el mismo commit.
- Nunca un selector de idioma visible.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- Errores como valores con `Result<T, E>` de `@/shared/result`. Nada de excepciones para flujo de negocio. Las llamadas a repositorios Drizzle se envuelven en `attempt` porque lanzan si la base cae.
- Todo comando que toque la base o compile necesita:
  `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`
- El panel es **solo español**. La página del invitado usa el idioma del evento (`events.locale`), no el del navegador.
- El token del invitado **nunca** se guarda en claro: en la base solo va su SHA-256.
- Un token desconocido responde **404, nunca 403**.

## Desviaciones del spec, con su motivo

Tres decisiones que este plan toma y el spec no fijaba. Si alguna no convence, se cambia aquí antes de ejecutar.

| Punto | Decisión del plan | Motivo |
|---|---|---|
| `sessions` | La tabla gana `token_hash bytea unique`; la cookie lleva un token opaco de 256 bits, no el `id` | Mismo argumento que el token del invitado: un volcado robado no debe producir sesiones utilizables |
| `theme_key` | Registro tipado de componentes en `src/modules/events/ui/themes/registry.ts`, con `clasico` como respaldo si la clave no existe | El spec dice "pieza compuesta a mano que se renderiza" sin definir el mecanismo; un registro tipado deja el fallo en tiempo de compilación |
| Caducidad de sesión | 30 días con renovación deslizante; la limpieza corre en la misma tarea programada que la anonimización | El spec crea `sessions.expires_at` pero no dice quién lo empuja ni quién lo barre |
| `client_shares` | Se crea y revoca desde `/panel/eventos/{slug}`; el spec no daba ruta para ello | Sin punto de creación la tabla es inalcanzable |

---

### Task 1: Layouts raíz múltiples y rutas fuera de `[locale]`

Deuda de la Task 8 del ciclo 1: el layout raíz se fusionó con `[locale]`, y ese layout emite `<html>`. El panel y las páginas de invitado viven fuera de `[locale]`, así que hoy no tienen dónde colgarse. Next permite **varias raíces** cuando no existe `src/app/layout.tsx` y cada rama vive en su propio grupo de rutas.

**Files:**
- Move: `src/app/[locale]/` → `src/app/(site)/[locale]/` (con `layout.tsx`, `page.tsx`, `opengraph-image.tsx`, `colecciones/page.tsx`)
- Create: `src/app/(panel)/layout.tsx`
- Create: `src/app/(panel)/panel/page.tsx`
- Create: `src/app/(guest)/layout.tsx`
- Create: `src/app/(guest)/i/[token]/page.tsx`
- Modify: `src/proxy.ts` (aplicar CSP a `/panel`, `/i`, `/compartir`)
- Modify: `src/app/robots.ts` (excluir las tres ramas)
- Test: `src/proxy.test.ts`, `src/app/robots.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: tres raíces de layout. `(site)` conserva `<html lang={locale}>`; `(panel)` emite `<html lang="es">`; `(guest)` emite `<html lang="es">` y la página de invitado sobreescribe el idioma en la Task 13.

- [ ] **Step 1: Escribir la prueba de proxy que falla**

Crear `src/proxy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from './proxy'

const request = (path: string) => new NextRequest(new URL(`http://localhost:3000${path}`))

describe('proxy', () => {
  it('pone CSP en las rutas del panel y del invitado', () => {
    for (const path of ['/panel', '/panel/entrar', '/i/abc123', '/compartir/xyz']) {
      const response = proxy(request(path))
      expect(response.headers.get('Content-Security-Policy'), path).toContain("script-src 'self' 'nonce-")
    }
  })

  it('sigue sin tocar /api ni /_next', () => {
    expect(proxy(request('/api/cualquiera')).headers.get('Content-Security-Policy')).toBeNull()
  })

  it('redirige la raíz al idioma negociado', () => {
    expect(proxy(request('/')).status).toBe(307)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm vitest run src/proxy.test.ts`
Expected: FAIL — `/panel` cae en la rama que devuelve `NextResponse.next()` sin política.

- [ ] **Step 3: Corregir el proxy**

En `src/proxy.ts`, sustituir el bloque de exclusión y la decisión de idioma por:

```ts
const CSP_PREFIXES = ['/panel', '/i/', '/compartir/'] as const

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // El panel y las páginas de invitado viven fuera de `[locale]`: no se negocia
  // idioma en ellas, pero sí necesitan la política con nonce.
  if (pathname === '/panel' || CSP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return withCsp(request)
  }

  const segment = pathname.split('/')[1] ?? ''
  if (isLocale(segment)) return withCsp(request)

  if (pathname !== '/') return withCsp(request)

  // …negociación de idioma sin cambios…
}
```

Borrar la línea `pathname.startsWith('/admin') ||` del bloque de exclusión: `/admin` no existe y su exclusión dejaba una rama sin CSP.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/proxy.test.ts`
Expected: PASS (3 pruebas).

- [ ] **Step 5: Escribir la prueba de robots**

Crear `src/app/robots.test.ts`:

```ts
import { expect, it } from 'vitest'
import robots from './robots'

it('bloquea el panel y las páginas con token', () => {
  const [rule] = robots().rules as Array<{ disallow: string[] }>
  expect(rule?.disallow).toEqual(expect.arrayContaining(['/panel', '/i/', '/compartir/', '/api']))
})
```

- [ ] **Step 6: Ejecutar, ver fallar, corregir robots**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/app/robots.test.ts` → FAIL.

En `src/app/robots.ts`, cambiar la regla a:

```ts
rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/i/', '/compartir/', '/api'] }],
```

Volver a ejecutar → PASS.

- [ ] **Step 7: Mover el sitio a su grupo de rutas**

```bash
mkdir -p "src/app/(site)"
git mv "src/app/[locale]" "src/app/(site)/[locale]"
```

En `src/app/(site)/[locale]/layout.tsx`, el import de estilos sube un nivel:

```ts
import '../../globals.css'
```

- [ ] **Step 8: Crear la raíz del panel**

`src/app/(panel)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import '../globals.css'

// El panel no negocia idioma: lo usa el atelier y está en español.
export const metadata = { title: 'Panel · InvitePremium', robots: { index: false, follow: false } }

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <main className="min-h-dvh bg-bg-top">{children}</main>
      </body>
    </html>
  )
}
```

`src/app/(panel)/panel/page.tsx` — provisional, la Task 8 la sustituye:

```tsx
export default function PanelHomePage() {
  return <p className="p-10 text-ink">Panel del atelier</p>
}
```

- [ ] **Step 9: Crear la raíz de las páginas de invitado**

`src/app/(guest)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import '../globals.css'

export const metadata = { robots: { index: false, follow: false } }

// `lang` se fija aquí en español porque la mayoría de los eventos son bolivianos; la
// página del evento lo corrige cuando `events.locale` dice otra cosa (Task 13).
export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

`src/app/(guest)/i/[token]/page.tsx` — provisional, la Task 13 la sustituye:

```tsx
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <p className="p-10">Invitación {token.slice(0, 4)}…</p>
}
```

- [ ] **Step 10: Verificar que las tres raíces conviven**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm build
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint
DATABASE_URL=… SITE_URL=… pnpm test
DATABASE_URL=… SITE_URL=… pnpm test:e2e
```

Expected: build sin el error `Missing <html> and <body> tags`; 11 e2e verdes (el sitio público no cambió de URL); `/panel` y `/i/abc` responden 200.

Si `pnpm test:e2e` reutiliza un servidor viejo (`reuseExistingServer`), matarlo antes: `lsof -i :3000 -sTCP:LISTEN`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "fix: reintroduce el layout raíz no dinámico con grupos de rutas

El panel y las páginas de invitado viven fuera de /[locale] y ese layout
emite <html>. Next admite varias raíces cuando no hay src/app/layout.tsx y
cada rama tiene su grupo: (site), (panel) y (guest).

El proxy pasaba /panel sin política de seguridad y robots.txt no lo excluía."
```

---

### Task 2: Esquema de la base

**Files:**
- Modify: `src/shared/db/schema.ts`
- Create: `db/migrations/0002_invitation_engine.sql` (generada por drizzle-kit y editada para `citext`)
- Test: `src/shared/db/invitation-schema.test.ts`

**Interfaces:**
- Produces: tablas `users`, `sessions`, `events`, `guestGroups`, `rsvpResponses`, `clientShares` exportadas desde `@/shared/db/schema`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/shared/db/invitation-schema.test.ts`:

```ts
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from './client'
import { events, guestGroups, rsvpResponses } from './schema'

class RollbackForTest extends Error {}

async function inRolledBackTransaction(run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx)
      throw new RollbackForTest()
    })
  } catch (error) {
    if (!(error instanceof RollbackForTest)) throw error
  }
}

describe('esquema del motor de invitaciones', () => {
  it('rechaza dos grupos con el mismo hash de token', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({ slug: 'boda-prueba', title: 'Boda de prueba', eventDate: '2026-12-05', rsvpDeadline: '2026-11-20', locale: 'es', themeKey: 'clasico', status: 'live' })
        .returning({ id: events.id })

      const hash = Buffer.alloc(32, 7)
      await tx.insert(guestGroups).values({ eventId: event!.id, label: 'Familia A', seats: 2, tokenHash: hash })

      await expect(
        tx.insert(guestGroups).values({ eventId: event!.id, label: 'Familia B', seats: 1, tokenHash: hash }),
      ).rejects.toThrow()
    })
  })

  it('borra en cascada las respuestas al borrar el evento', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({ slug: 'cascada', title: 'Cascada', eventDate: '2026-12-05', rsvpDeadline: '2026-11-20', locale: 'es', themeKey: 'clasico', status: 'live' })
        .returning({ id: events.id })
      const [group] = await tx
        .insert(guestGroups)
        .values({ eventId: event!.id, label: 'Familia C', seats: 3, tokenHash: Buffer.alloc(32, 9) })
        .returning({ id: guestGroups.id })
      await tx.insert(rsvpResponses).values({ guestGroupId: group!.id, attending: 2 })

      await tx.delete(events).where(sql`${events.id} = ${event!.id}`)

      expect(await tx.select().from(rsvpResponses)).toHaveLength(0)
    })
  })

  it('tiene la extensión citext instalada', async () => {
    const rows = await db.execute(sql`select 1 from pg_extension where extname = 'citext'`)
    expect(rows.length).toBe(1)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/shared/db/invitation-schema.test.ts`
Expected: FAIL — `events` no existe en `schema.ts`.

- [ ] **Step 3: Añadir las tablas**

Al final de `src/shared/db/schema.ts` (`customType` para `citext`, porque drizzle no lo trae):

```ts
import { bytea } from 'drizzle-orm/pg-core' // no existe: se define abajo
```

En su lugar, añadir arriba del archivo, junto a los demás imports de `drizzle-orm/pg-core`, `customType`; y al final del archivo:

```ts
// Postgres no tiene un tipo `bytea` en drizzle-orm/pg-core, y `citext` requiere la
// extensión. Ambos se declaran a mano para que el esquema tipado no mienta.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })
const citext = customType<{ data: string }>({ dataType: () => 'citext' })

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // La cookie lleva un token opaco; aquí solo vive su SHA-256.
    tokenHash: bytea('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('sessions_expires_idx').on(t.expiresAt)],
)

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  title: varchar('title', { length: 160 }).notNull(),
  eventDate: date('event_date').notNull(),
  rsvpDeadline: date('rsvp_deadline').notNull(),
  locale: varchar('locale', { length: 5 }).notNull(),
  themeKey: varchar('theme_key', { length: 64 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  retentionDays: integer('retention_days').notNull().default(90),
  anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  ...timestamps,
})

export const guestGroups = pgTable(
  'guest_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 160 }).notNull(),
    seats: integer('seats').notNull(),
    tokenHash: bytea('token_hash').notNull().unique(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('guest_groups_event_idx').on(t.eventId)],
)

export const rsvpResponses = pgTable(
  'rsvp_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestGroupId: uuid('guest_group_id')
      .notNull()
      .references(() => guestGroups.id, { onDelete: 'cascade' }),
    attending: integer('attending').notNull(),
    message: text('message'),
    respondedAt: timestamp('responded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('rsvp_responses_group_recent_idx').on(t.guestGroupId, t.respondedAt.desc())],
)

export const clientShares = pgTable('client_shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  tokenHash: bytea('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const eventsRelations = relations(events, ({ many }) => ({ guestGroups: many(guestGroups) }))
export const guestGroupsRelations = relations(guestGroups, ({ many, one }) => ({
  responses: many(rsvpResponses),
  event: one(events, { fields: [guestGroups.eventId], references: [events.id] }),
}))
```

- [ ] **Step 4: Generar y editar la migración**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite pnpm db:generate
```

Renombrar el archivo generado a `db/migrations/0002_invitation_engine.sql` (y su entrada en `db/migrations/meta/_journal.json`). Añadir como **primera línea** del SQL:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

Sin ella, `CREATE TABLE users … email citext` falla en una base limpia.

- [ ] **Step 5: Aplicar y ver la prueba en verde**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite pnpm db:migrate
DATABASE_URL=… SITE_URL=… pnpm vitest run src/shared/db/invitation-schema.test.ts
```

Expected: PASS (3 pruebas).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): tablas del motor de invitaciones con hash de token

users, sessions, events, guest_groups, rsvp_responses y client_shares. El
token del invitado y el de sesión solo existen como SHA-256 en la base;
citext hace el correo insensible a mayúsculas sin índice funcional."
```

---

### Task 3: Dominio de identidad

**Files:**
- Create: `src/modules/identity/domain/errors.ts`
- Create: `src/modules/identity/domain/credential.ts`
- Create: `src/modules/identity/domain/session.ts`
- Create: `src/modules/identity/index.ts`
- Test: `src/modules/identity/domain/credential.test.ts`, `src/modules/identity/domain/session.test.ts`

**Interfaces:**
- Produces:
  - `type IdentityErrorKind = 'invalid_email' | 'weak_password' | 'invalid_credentials' | 'session_expired' | 'too_many_attempts' | 'storage_failure'`
  - `identityError(kind, detail): IdentityError`
  - `createCredential(input: { email: string; password: string }): Result<Credential, IdentityError>` con `Credential = { readonly email: string; readonly password: string }`
  - `SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000`
  - `isSessionExpired(session: { expiresAt: Date }, now: Date): boolean`
  - `nextExpiry(now: Date): Date`
  - `shouldRenew(session: { expiresAt: Date }, now: Date): boolean`

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/modules/identity/domain/credential.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createCredential } from './credential'

describe('createCredential', () => {
  it('normaliza el correo a minúsculas y sin espacios', () => {
    const result = createCredential({ email: '  Atelier@Invite.BO ', password: 'contrasena-larga-1' })
    expect(isOk(result) && result.value.email).toBe('atelier@invite.bo')
  })

  it('rechaza un correo sin arroba', () => {
    const result = createCredential({ email: 'atelier', password: 'contrasena-larga-1' })
    expect(isErr(result) && result.error.kind).toBe('invalid_email')
  })

  it('rechaza una contraseña de menos de 12 caracteres', () => {
    const result = createCredential({ email: 'a@b.bo', password: 'corta1' })
    expect(isErr(result) && result.error.kind).toBe('weak_password')
  })

  it('no recorta la contraseña: los espacios son parte de ella', () => {
    const result = createCredential({ email: 'a@b.bo', password: '  espacios cuentan  ' })
    expect(isOk(result) && result.value.password).toBe('  espacios cuentan  ')
  })
})
```

`src/modules/identity/domain/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SESSION_TTL_MS, isSessionExpired, nextExpiry, shouldRenew } from './session'

const at = (iso: string) => new Date(iso)

describe('sesión', () => {
  it('caduca cuando la fecha ya pasó', () => {
    expect(isSessionExpired({ expiresAt: at('2026-08-19T10:00:00Z') }, at('2026-08-19T10:00:01Z'))).toBe(true)
    expect(isSessionExpired({ expiresAt: at('2026-08-19T10:00:00Z') }, at('2026-08-19T09:59:59Z'))).toBe(false)
  })

  it('la próxima caducidad son 30 días', () => {
    expect(nextExpiry(at('2026-08-19T00:00:00Z')).getTime() - at('2026-08-19T00:00:00Z').getTime()).toBe(SESSION_TTL_MS)
  })

  it('renueva solo cuando queda menos de la mitad de la ventana', () => {
    const now = at('2026-08-19T00:00:00Z')
    const casiNueva = { expiresAt: new Date(now.getTime() + SESSION_TTL_MS - 60_000) }
    const gastada = { expiresAt: new Date(now.getTime() + SESSION_TTL_MS / 4) }
    expect(shouldRenew(casiNueva, now)).toBe(false)
    expect(shouldRenew(gastada, now)).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Escribir el dominio**

`src/modules/identity/domain/errors.ts`:

```ts
export type IdentityErrorKind =
  | 'invalid_email'
  | 'weak_password'
  | 'invalid_credentials'
  | 'session_expired'
  | 'too_many_attempts'
  | 'storage_failure'

export type IdentityError = { readonly kind: IdentityErrorKind; readonly detail: string }

export const identityError = (kind: IdentityErrorKind, detail: string): IdentityError => ({ kind, detail })
```

`src/modules/identity/domain/credential.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from './errors'

export type Credential = { readonly email: string; readonly password: string }

const MIN_PASSWORD_LENGTH = 12
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createCredential(input: { email: string; password: string }): Result<Credential, IdentityError> {
  const email = input.email.trim().toLowerCase()
  if (!EMAIL_SHAPE.test(email)) {
    return err(identityError('invalid_email', `Correo inválido: ${input.email}`))
  }

  // La contraseña no se recorta: un espacio al final es un carácter que el usuario
  // eligió, y recortarlo haría que la contraseña guardada no sea la que él escribe.
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return err(identityError('weak_password', `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres`))
  }

  return ok({ email, password: input.password })
}
```

`src/modules/identity/domain/session.ts`:

```ts
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type SessionWindow = { readonly expiresAt: Date }

export const isSessionExpired = (session: SessionWindow, now: Date): boolean =>
  session.expiresAt.getTime() <= now.getTime()

export const nextExpiry = (now: Date): Date => new Date(now.getTime() + SESSION_TTL_MS)

/**
 * Renovación deslizante: se empuja la caducidad solo cuando ya se gastó más de la mitad
 * de la ventana, para no escribir en la base en cada petición del panel.
 */
export const shouldRenew = (session: SessionWindow, now: Date): boolean =>
  session.expiresAt.getTime() - now.getTime() < SESSION_TTL_MS / 2
```

`src/modules/identity/index.ts`:

```ts
export type { Credential } from './domain/credential'
export type { IdentityError, IdentityErrorKind } from './domain/errors'
export { SESSION_TTL_MS } from './domain/session'
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity`
Expected: PASS (7 pruebas).

- [ ] **Step 5: Commit**

```bash
git add src/modules/identity
git commit -m "feat(identity): credencial y ventana de sesión como dominio puro"
```

---

### Task 4: Casos de uso de identidad

**Files:**
- Create: `src/modules/identity/application/ports.ts`
- Create: `src/modules/identity/application/sign-in.ts`
- Create: `src/modules/identity/application/sign-out.ts`
- Create: `src/modules/identity/application/authenticate-session.ts`
- Test: `src/modules/identity/application/sign-in.test.ts`, `src/modules/identity/application/authenticate-session.test.ts`

**Interfaces:**
- Consumes: `createCredential`, `identityError`, `isSessionExpired`, `nextExpiry`, `shouldRenew` de la Task 3.
- Produces:

```ts
export interface UserRepository {
  findByEmail(email: string): Promise<{ id: string; email: string; passwordHash: string } | null>
  create(user: { email: string; passwordHash: string }): Promise<{ id: string }>
}

export interface SessionRepository {
  create(session: { userId: string; tokenHash: Buffer; expiresAt: Date }): Promise<void>
  findByTokenHash(tokenHash: Buffer): Promise<{ id: string; userId: string; expiresAt: Date } | null>
  touch(id: string, expiresAt: Date): Promise<void>
  deleteByTokenHash(tokenHash: Buffer): Promise<void>
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}

export interface TokenMinter {
  mint(): { token: string; hash: Buffer }
  hashOf(token: string): Buffer
}

signIn(deps): (input: { email: string; password: string }) => Promise<Result<{ token: string; expiresAt: Date }, IdentityError>>
signOut(deps): (token: string) => Promise<Result<null, IdentityError>>
authenticateSession(deps): (token: string | null) => Promise<Result<{ userId: string; renewedUntil: Date | null }, IdentityError>>
```

- [ ] **Step 1: Escribir la prueba de `signIn`**

`src/modules/identity/application/sign-in.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { signIn } from './sign-in'
import type { PasswordHasher, SessionRepository, TokenMinter, UserRepository } from './ports'

const HASH = '$argon2id$v=19$fake'

const users = (row: { id: string; email: string; passwordHash: string } | null): UserRepository => ({
  findByEmail: async () => row,
  create: async () => ({ id: 'nuevo' }),
})

const sessions = (): SessionRepository & { created: unknown[] } => {
  const created: unknown[] = []
  return {
    created,
    create: async (session) => void created.push(session),
    findByTokenHash: async () => null,
    touch: async () => {},
    deleteByTokenHash: async () => {},
  }
}

const hasher = (matches: boolean): PasswordHasher => ({
  hash: async () => HASH,
  verify: async () => matches,
})

const minter: TokenMinter = {
  mint: () => ({ token: 'token-en-claro', hash: Buffer.alloc(32, 1) }),
  hashOf: () => Buffer.alloc(32, 1),
}

const clock = () => new Date('2026-08-19T12:00:00Z')

describe('signIn', () => {
  it('crea la sesión y devuelve el token en claro una sola vez', async () => {
    const store = sessions()
    const result = await signIn({ users: users({ id: 'u1', email: 'a@b.bo', passwordHash: HASH }), sessions: store, hasher: hasher(true), minter, clock })({
      email: 'A@B.bo',
      password: 'contrasena-larga-1',
    })

    expect(isOk(result) && result.value.token).toBe('token-en-claro')
    expect(store.created).toHaveLength(1)
  })

  it('devuelve invalid_credentials cuando el correo no existe', async () => {
    const result = await signIn({ users: users(null), sessions: sessions(), hasher: hasher(true), minter, clock })({
      email: 'a@b.bo',
      password: 'contrasena-larga-1',
    })
    expect(isErr(result) && result.error.kind).toBe('invalid_credentials')
  })

  it('verifica el hash aunque el usuario no exista, para no filtrar por tiempo', async () => {
    const spy = vi.fn(async () => false)
    await signIn({ users: users(null), sessions: sessions(), hasher: { hash: async () => HASH, verify: spy }, minter, clock })({
      email: 'a@b.bo',
      password: 'contrasena-larga-1',
    })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('devuelve invalid_credentials, no weak_password, con una contraseña corta', async () => {
    const result = await signIn({ users: users({ id: 'u1', email: 'a@b.bo', passwordHash: HASH }), sessions: sessions(), hasher: hasher(true), minter, clock })({
      email: 'a@b.bo',
      password: 'corta',
    })
    expect(isErr(result) && result.error.kind).toBe('invalid_credentials')
  })
})
```

- [ ] **Step 2: Escribir la prueba de `authenticateSession`**

`src/modules/identity/application/authenticate-session.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { SESSION_TTL_MS } from '../domain/session'
import { authenticateSession } from './authenticate-session'
import type { SessionRepository, TokenMinter } from './ports'

const NOW = new Date('2026-08-19T12:00:00Z')
const minter: TokenMinter = { mint: () => ({ token: 't', hash: Buffer.alloc(32, 1) }), hashOf: () => Buffer.alloc(32, 1) }

const repo = (row: { id: string; userId: string; expiresAt: Date } | null) => {
  const touched: Array<{ id: string; expiresAt: Date }> = []
  const sessions: SessionRepository = {
    create: async () => {},
    findByTokenHash: async () => row,
    touch: async (id, expiresAt) => void touched.push({ id, expiresAt }),
    deleteByTokenHash: async () => {},
  }
  return { sessions, touched }
}

describe('authenticateSession', () => {
  it('rechaza una cookie ausente sin tocar la base', async () => {
    const { sessions, touched } = repo(null)
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })(null)
    expect(isErr(result) && result.error.kind).toBe('session_expired')
    expect(touched).toHaveLength(0)
  })

  it('renueva la sesión gastada y devuelve la nueva caducidad', async () => {
    const { sessions, touched } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS / 4) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isOk(result) && result.value.userId).toBe('u1')
    expect(touched).toHaveLength(1)
  })

  it('no escribe cuando la sesión aún está fresca', async () => {
    const { sessions, touched } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS - 1000) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isOk(result) && result.value.renewedUntil).toBeNull()
    expect(touched).toHaveLength(0)
  })

  it('rechaza una sesión caducada', async () => {
    const { sessions } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() - 1) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isErr(result) && result.error.kind).toBe('session_expired')
  })
})
```

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity/application`
Expected: FAIL — no existen `sign-in.ts` ni `authenticate-session.ts`.

- [ ] **Step 4: Escribir los puertos y los casos de uso**

`src/modules/identity/application/ports.ts` — exactamente las cuatro interfaces del bloque **Interfaces** de esta tarea.

`src/modules/identity/application/sign-in.ts`:

```ts
import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createCredential } from '../domain/credential'
import { identityError, type IdentityError } from '../domain/errors'
import { nextExpiry } from '../domain/session'
import type { PasswordHasher, SessionRepository, TokenMinter, UserRepository } from './ports'

// Hash de una contraseña que no existe. Verificar contra él cuesta lo mismo que
// verificar una real, así que el tiempo de respuesta no distingue "no hay usuario"
// de "contraseña mala".
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$0000000000000000000000000000000000000000000'

export const signIn =
  (deps: {
    users: UserRepository
    sessions: SessionRepository
    hasher: PasswordHasher
    minter: TokenMinter
    clock: () => Date
  }) =>
  async (input: { email: string; password: string }): Promise<Result<{ token: string; expiresAt: Date }, IdentityError>> =>
    attempt(async () => {
      const credential = createCredential(input)
      // Un correo mal escrito o una contraseña corta se responden como credenciales
      // inválidas: decir cuál de las dos falló ayuda a quien prueba a ciegas.
      if (isErr(credential)) {
        await deps.hasher.verify(input.password, DUMMY_HASH)
        return err(identityError('invalid_credentials', credential.error.detail))
      }

      const user = await deps.users.findByEmail(credential.value.email)
      const matches = await deps.hasher.verify(credential.value.password, user?.passwordHash ?? DUMMY_HASH)

      if (user === null || !matches) {
        return err(identityError('invalid_credentials', `Intento fallido para ${credential.value.email}`))
      }

      const { token, hash } = deps.minter.mint()
      const expiresAt = nextExpiry(deps.clock())
      await deps.sessions.create({ userId: user.id, tokenHash: hash, expiresAt })

      return ok({ token, expiresAt })
    }, (cause) => identityError('storage_failure', `No se pudo iniciar sesión: ${String(cause)}`))
```

`src/modules/identity/application/authenticate-session.ts`:

```ts
import { attempt, err, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from '../domain/errors'
import { isSessionExpired, nextExpiry, shouldRenew } from '../domain/session'
import type { SessionRepository, TokenMinter } from './ports'

export const authenticateSession =
  (deps: { sessions: SessionRepository; minter: TokenMinter; clock: () => Date }) =>
  async (token: string | null): Promise<Result<{ userId: string; renewedUntil: Date | null }, IdentityError>> =>
    attempt(async () => {
      if (token === null || token.length === 0) {
        return err(identityError('session_expired', 'Petición sin cookie de sesión'))
      }

      const now = deps.clock()
      const session = await deps.sessions.findByTokenHash(deps.minter.hashOf(token))

      if (session === null || isSessionExpired(session, now)) {
        return err(identityError('session_expired', 'Sesión inexistente o caducada'))
      }

      if (!shouldRenew(session, now)) return ok({ userId: session.userId, renewedUntil: null })

      const renewedUntil = nextExpiry(now)
      await deps.sessions.touch(session.id, renewedUntil)
      return ok({ userId: session.userId, renewedUntil })
    }, (cause) => identityError('storage_failure', `No se pudo validar la sesión: ${String(cause)}`))
```

`src/modules/identity/application/sign-out.ts`:

```ts
import { attempt, ok, type Result } from '@/shared/result'
import { identityError, type IdentityError } from '../domain/errors'
import type { SessionRepository, TokenMinter } from './ports'

export const signOut =
  (deps: { sessions: SessionRepository; minter: TokenMinter }) =>
  async (token: string): Promise<Result<null, IdentityError>> =>
    attempt(async () => {
      await deps.sessions.deleteByTokenHash(deps.minter.hashOf(token))
      return ok(null)
    }, (cause) => identityError('storage_failure', `No se pudo cerrar la sesión: ${String(cause)}`))
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity`
Expected: PASS (15 pruebas).

- [ ] **Step 6: Commit**

```bash
git add src/modules/identity
git commit -m "feat(identity): inicio y cierre de sesión con renovación deslizante

signIn verifica un hash señuelo cuando el correo no existe, para que el
tiempo de respuesta no revele qué correos están dados de alta."
```

---

### Task 5: Infraestructura de identidad y comando de alta

**Files:**
- Create: `src/shared/security/tokens.ts`
- Create: `src/modules/identity/infrastructure/argon2-hasher.ts`
- Create: `src/modules/identity/infrastructure/drizzle-user-repository.ts`
- Create: `src/modules/identity/infrastructure/drizzle-session-repository.ts`
- Create: `scripts/create-atelier-user.ts`
- Modify: `package.json` (dependencia `@node-rs/argon2`, script `user:create`)
- Modify: `next.config.ts` (`outputFileTracingIncludes` para el binario nativo)
- Test: `src/shared/security/tokens.test.ts`, `src/modules/identity/infrastructure/identity-repositories.test.ts`

**Interfaces:**
- Consumes: `UserRepository`, `SessionRepository`, `PasswordHasher`, `TokenMinter` de la Task 4.
- Produces:
  - `createTokenMinter(): TokenMinter` en `@/shared/security/tokens` — 128 bits, base64url de 22 caracteres, hash SHA-256.
  - `argon2Hasher: PasswordHasher`
  - `drizzleUserRepository: UserRepository`, `createDrizzleUserRepository(db: DbExecutor)`
  - `drizzleSessionRepository: SessionRepository`, `createDrizzleSessionRepository(db: DbExecutor)`
  - `pnpm user:create <correo>` pide la contraseña por entrada estándar y da de alta al usuario.

- [ ] **Step 1: Escribir la prueba del acuñador de tokens**

`src/shared/security/tokens.test.ts`:

```ts
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createTokenMinter } from './tokens'

describe('createTokenMinter', () => {
  const minter = createTokenMinter()

  it('acuña 22 caracteres base64url, sin relleno', () => {
    const { token } = minter.mint()
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })

  it('no repite tokens', () => {
    const acuñados = new Set(Array.from({ length: 500 }, () => minter.mint().token))
    expect(acuñados.size).toBe(500)
  })

  it('el hash es el SHA-256 del token en claro', () => {
    const { token, hash } = minter.mint()
    expect(hash.equals(createHash('sha256').update(token).digest())).toBe(true)
    expect(minter.hashOf(token).equals(hash)).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar, ver fallar, escribir el acuñador**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/shared/security/tokens.test.ts` → FAIL.

`src/shared/security/tokens.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto'

export type MintedToken = { readonly token: string; readonly hash: Buffer }

export interface Minter {
  mint(): MintedToken
  hashOf(token: string): Buffer
}

const TOKEN_BYTES = 16 // 128 bits, como fija la sección 7 del spec

/**
 * El token en claro existe una sola vez: cuando se acuña y se entrega. En la base solo
 * queda su SHA-256, así que un volcado robado no produce enlaces utilizables. SHA-256
 * sin sal basta porque el token ya es aleatorio uniforme de 128 bits: no hay diccionario
 * que precalcular.
 */
export function createTokenMinter(): Minter {
  const hashOf = (token: string): Buffer => createHash('sha256').update(token).digest()

  return {
    hashOf,
    mint() {
      const token = randomBytes(TOKEN_BYTES).toString('base64url')
      return { token, hash: hashOf(token) }
    },
  }
}
```

Volver a ejecutar → PASS (3 pruebas).

- [ ] **Step 3: Instalar Argon2 y asegurar que sobrevive al empaquetado**

```bash
pnpm add @node-rs/argon2
```

En `next.config.ts`, dentro de `outputFileTracingIncludes`, añadir la entrada:

```ts
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/.pnpm/**/@swc/helpers/**', './node_modules/.pnpm/**/@node-rs/argon2*/**'],
  },
```

El binario nativo no se ve como import y el rastreo lo pierde, igual que pasó con `@swc/helpers` en la Task 14 del ciclo 1: sin esta línea el contenedor muere al arrancar con `MODULE_NOT_FOUND`.

- [ ] **Step 4: Escribir el hasher**

`src/modules/identity/infrastructure/argon2-hasher.ts`:

```ts
import { hash, verify } from '@node-rs/argon2'
import type { PasswordHasher } from '../application/ports'

// Parámetros de la recomendación OWASP para Argon2id: 19 MiB, 2 pasadas, 1 hilo.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const

export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, OPTIONS),
  // Un hash con formato inválido hace que `verify` lance; aquí eso es "no coincide",
  // no una caída: el hash señuelo de `signIn` pasa por este mismo camino.
  verify: async (password, digest) => {
    try {
      return await verify(digest, password, OPTIONS)
    } catch {
      return false
    }
  },
}
```

- [ ] **Step 5: Escribir la prueba de los repositorios**

`src/modules/identity/infrastructure/identity-repositories.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { createTokenMinter } from '@/shared/security/tokens'
import { createDrizzleSessionRepository } from './drizzle-session-repository'
import { createDrizzleUserRepository } from './drizzle-user-repository'

class RollbackForTest extends Error {}

async function inRolledBackTransaction(run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx)
      throw new RollbackForTest()
    })
  } catch (error) {
    if (!(error instanceof RollbackForTest)) throw error
  }
}

describe('repositorios de identidad', () => {
  it('encuentra el usuario ignorando mayúsculas gracias a citext', async () => {
    await inRolledBackTransaction(async (tx) => {
      const users = createDrizzleUserRepository(tx)
      await users.create({ email: 'Atelier@Invite.bo', passwordHash: 'hash' })
      expect(await users.findByEmail('atelier@invite.bo')).not.toBeNull()
    })
  })

  it('guarda, encuentra, renueva y borra una sesión por su hash', async () => {
    await inRolledBackTransaction(async (tx) => {
      const users = createDrizzleUserRepository(tx)
      const sessions = createDrizzleSessionRepository(tx)
      const minter = createTokenMinter()

      const user = await users.create({ email: 'sesion@invite.bo', passwordHash: 'hash' })
      const { token, hash } = minter.mint()
      const expiresAt = new Date('2026-09-19T00:00:00Z')
      await sessions.create({ userId: user.id, tokenHash: hash, expiresAt })

      const found = await sessions.findByTokenHash(minter.hashOf(token))
      expect(found?.userId).toBe(user.id)

      const later = new Date('2026-10-19T00:00:00Z')
      await sessions.touch(found!.id, later)
      expect((await sessions.findByTokenHash(hash))?.expiresAt.toISOString()).toBe(later.toISOString())

      await sessions.deleteByTokenHash(hash)
      expect(await sessions.findByTokenHash(hash)).toBeNull()
    })
  })
})
```

- [ ] **Step 6: Ejecutar, ver fallar, escribir los repositorios**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity/infrastructure` → FAIL.

`src/modules/identity/infrastructure/drizzle-user-repository.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { users } from '@/shared/db/schema'
import type { UserRepository } from '../application/ports'

export const createDrizzleUserRepository = (database: DbExecutor): UserRepository => ({
  async findByEmail(email) {
    const [row] = await database
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row ?? null
  },

  async create(user) {
    const [row] = await database.insert(users).values(user).returning({ id: users.id })
    // `returning` siempre trae la fila insertada; si no lo hiciera, el error debe
    // estallar aquí y no viajar como un id vacío.
    if (row === undefined) throw new Error('El alta de usuario no devolvió id')
    return row
  },
})

export const drizzleUserRepository = createDrizzleUserRepository(db)
```

`src/modules/identity/infrastructure/drizzle-session-repository.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { sessions } from '@/shared/db/schema'
import type { SessionRepository } from '../application/ports'

export const createDrizzleSessionRepository = (database: DbExecutor): SessionRepository => ({
  async create(session) {
    await database.insert(sessions).values(session)
  },

  async findByTokenHash(tokenHash) {
    const [row] = await database
      .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1)
    return row ?? null
  },

  async touch(id, expiresAt) {
    await database.update(sessions).set({ expiresAt }).where(eq(sessions.id, id))
  },

  async deleteByTokenHash(tokenHash) {
    await database.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  },
})

export const drizzleSessionRepository = createDrizzleSessionRepository(db)
```

Volver a ejecutar → PASS (2 pruebas).

- [ ] **Step 7: Escribir el comando de alta**

`scripts/create-atelier-user.ts`:

```ts
/**
 * Alta del usuario del atelier. No hay registro público: este comando es la única
 * puerta. La contraseña se lee de la entrada estándar para que no quede en el
 * historial del intérprete de órdenes.
 *
 *   DATABASE_URL=… SITE_URL=… pnpm user:create atelier@invitepremium.bo
 */
import { createInterface } from 'node:readline/promises'
import { createCredential } from '@/modules/identity/domain/credential'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { isErr } from '@/shared/result'

const email = process.argv[2]
if (email === undefined) {
  console.error('Uso: pnpm user:create <correo>')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const password = await rl.question('Contraseña (mínimo 12 caracteres): ')
rl.close()

const credential = createCredential({ email, password })
if (isErr(credential)) {
  console.error(`Rechazado — ${credential.error.detail}`)
  process.exit(1)
}

if (await drizzleUserRepository.findByEmail(credential.value.email)) {
  console.error(`Ya existe un usuario con el correo ${credential.value.email}`)
  process.exit(1)
}

const passwordHash = await argon2Hasher.hash(credential.value.password)
const { id } = await drizzleUserRepository.create({ email: credential.value.email, passwordHash })
console.log(`Usuario creado: ${credential.value.email} (${id})`)
process.exit(0)
```

En `package.json`, junto a `db:seed`:

```json
    "user:create": "tsx --tsconfig tsconfig.json scripts/create-atelier-user.ts",
```

- [ ] **Step 8: Probar el comando a mano**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm user:create atelier@invitepremium.bo
```

Expected: pide contraseña, imprime `Usuario creado: …`. Repetir el comando debe decir que ya existe. Con una contraseña de 5 caracteres debe rechazar sin escribir en la base.

- [ ] **Step 9: Verificar y commit**

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(identity): hasher Argon2id, repositorios Drizzle y alta por consola

El binario nativo de @node-rs/argon2 no lo ve el rastreo de Next: se añade
a outputFileTracingIncludes o el contenedor muere al arrancar."
```

---

### Task 6: Inicio de sesión del panel

**Files:**
- Create: `src/modules/identity/actions.ts`
- Create: `src/modules/identity/application/guarded-sign-in.ts`
- Create: `src/modules/identity/ui/SignInForm.tsx`
- Create: `src/modules/identity/session-cookie.ts`
- Create: `src/app/(panel)/panel/entrar/page.tsx`
- Modify: `src/app/composition/container.ts`
- Modify: `src/app/(panel)/panel/page.tsx` (exigir sesión)
- Test: `src/modules/identity/application/guarded-sign-in.test.ts`, `src/modules/identity/ui/SignInForm.test.tsx`

**Interfaces:**
- Consumes: `signIn`, `signOut`, `authenticateSession` (Task 4); `argon2Hasher`, repositorios y `createTokenMinter` (Task 5); `createRateLimiter` y `clientIpFrom` de `@/modules/leads/application/*`.
- Produces:
  - `SESSION_COOKIE = 'invite_session'`, `sessionCookieOptions(expiresAt: Date)`
  - `guardedSignIn(deps)(input: { ip: string; payload: unknown }): Promise<SignInOutcome>` con `SignInOutcome = { status: 'success'; token: string; expiresAt: Date } | { status: 'error'; message: 'invalid_credentials' | 'too_many_attempts' | 'storage_failure' }`
  - `signInAction`, `signOutAction` (Server Actions)
  - `requireSession(): Promise<{ userId: string }>` en `src/modules/identity/session-cookie.ts`, que redirige a `/panel/entrar` si no hay sesión.

- [ ] **Step 1: Escribir la prueba del guardián**

`src/modules/identity/application/guarded-sign-in.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { err, ok } from '@/shared/result'
import { identityError } from '../domain/errors'
import { guardedSignIn } from './guarded-sign-in'

const limiter = (limited: boolean) => ({ isLimited: () => limited })
const success = async () => ok({ token: 'tok', expiresAt: new Date('2026-09-19T00:00:00Z') })
const failure = async () => err(identityError('invalid_credentials', 'clave mala'))
const noop = () => {}

const payload = { email: 'a@b.bo', password: 'contrasena-larga-1' }

describe('guardedSignIn', () => {
  it('corta antes de tocar la base cuando la IP está limitada', async () => {
    let llamadas = 0
    const result = await guardedSignIn({
      ipLimiter: limiter(true),
      accountLimiter: limiter(false),
      signIn: async () => (llamadas++, ok({ token: 't', expiresAt: new Date() })),
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', payload })

    expect(result).toEqual({ status: 'error', message: 'too_many_attempts' })
    expect(llamadas).toBe(0)
  })

  it('limita también por cuenta, para que rotar IP no sirva', async () => {
    const result = await guardedSignIn({
      ipLimiter: limiter(false),
      accountLimiter: limiter(true),
      signIn: success,
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', payload })
    expect(result).toEqual({ status: 'error', message: 'too_many_attempts' })
  })

  it('devuelve el token cuando las credenciales sirven', async () => {
    const result = await guardedSignIn({ ipLimiter: limiter(false), accountLimiter: limiter(false), signIn: success, clock: () => 0, log: noop })({ ip: '1.2.3.4', payload })
    expect(result.status).toBe('success')
  })

  it('no filtra el detalle del error al cliente', async () => {
    const result = await guardedSignIn({ ipLimiter: limiter(false), accountLimiter: limiter(false), signIn: failure, clock: () => 0, log: noop })({ ip: '1.2.3.4', payload })
    expect(result).toEqual({ status: 'error', message: 'invalid_credentials' })
  })

  it('rechaza un cuerpo que no es un formulario válido', async () => {
    const result = await guardedSignIn({ ipLimiter: limiter(false), accountLimiter: limiter(false), signIn: success, clock: () => 0, log: noop })({ ip: '1.2.3.4', payload: { email: 5 } })
    expect(result).toEqual({ status: 'error', message: 'invalid_credentials' })
  })
})
```

- [ ] **Step 2: Ejecutar, ver fallar, escribir el guardián**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity/application/guarded-sign-in.test.ts` → FAIL.

`src/modules/identity/application/guarded-sign-in.ts`:

```ts
import { isErr, type Result } from '@/shared/result'
import type { RateLimiter } from '@/modules/leads/application/rate-limit'
import type { IdentityError } from '../domain/errors'

export type SignInOutcome =
  | { status: 'success'; token: string; expiresAt: Date }
  | { status: 'error'; message: 'invalid_credentials' | 'too_many_attempts' | 'storage_failure' }

const readCredentials = (payload: unknown): { email: string; password: string } | null => {
  if (typeof payload !== 'object' || payload === null) return null
  const { email, password } = payload as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string') return null
  return { email, password }
}

/**
 * Dos limitadores: por IP, contra quien prueba muchas cuentas desde un sitio; y por
 * cuenta, contra quien prueba una cuenta desde muchas IP. Ninguno solo cubre al otro.
 */
export const guardedSignIn =
  (deps: {
    ipLimiter: RateLimiter
    accountLimiter: RateLimiter
    signIn: (input: { email: string; password: string }) => Promise<Result<{ token: string; expiresAt: Date }, IdentityError>>
    clock: () => number
    log: (message: string, kind: string, detail: string) => void
  }) =>
  async ({ ip, payload }: { ip: string; payload: unknown }): Promise<SignInOutcome> => {
    const now = deps.clock()
    if (deps.ipLimiter.isLimited(ip, now)) return { status: 'error', message: 'too_many_attempts' }

    const credentials = readCredentials(payload)
    if (credentials === null) return { status: 'error', message: 'invalid_credentials' }

    const account = credentials.email.trim().toLowerCase()
    if (deps.accountLimiter.isLimited(account, now)) return { status: 'error', message: 'too_many_attempts' }

    const result = await deps.signIn(credentials)
    if (isErr(result)) {
      deps.log('inicio de sesión rechazado', result.error.kind, result.error.detail)
      return { status: 'error', message: result.error.kind === 'storage_failure' ? 'storage_failure' : 'invalid_credentials' }
    }

    return { status: 'success', token: result.value.token, expiresAt: result.value.expiresAt }
  }
```

Volver a ejecutar → PASS (5 pruebas).

- [ ] **Step 3: Componer en el contenedor**

En `src/app/composition/container.ts`, añadir imports y la agrupación:

```ts
import { authenticateSession } from '@/modules/identity/application/authenticate-session'
import { signIn } from '@/modules/identity/application/sign-in'
import { signOut } from '@/modules/identity/application/sign-out'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { createTokenMinter } from '@/shared/security/tokens'

const minter = createTokenMinter()
const clock = () => new Date()

export const identity = {
  signIn: signIn({ users: drizzleUserRepository, sessions: drizzleSessionRepository, hasher: argon2Hasher, minter, clock }),
  signOut: signOut({ sessions: drizzleSessionRepository, minter }),
  authenticateSession: authenticateSession({ sessions: drizzleSessionRepository, minter, clock }),
} as const
```

- [ ] **Step 4: Escribir la cookie y el guardián de ruta**

`src/modules/identity/session-cookie.ts`:

```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { identity } from '@/app/composition/container'
import { isErr } from '@/shared/result'

export const SESSION_COOKIE = 'invite_session'

export const sessionCookieOptions = (expiresAt: Date) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  }) as const

/**
 * Puerta de todas las páginas del panel. Devuelve el usuario o redirige: nunca
 * devuelve `null`, para que ninguna página pueda olvidarse de comprobarlo.
 */
export async function requireSession(): Promise<{ userId: string }> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value ?? null
  const result = await identity.authenticateSession(token)

  if (isErr(result)) redirect('/panel/entrar')

  return { userId: result.value.userId }
}
```

Nota para quien implemente: la renovación deslizante escribe en la base pero **no** puede reescribir la cookie desde un Server Component (Next lo prohíbe). La cookie se refresca en la siguiente acción del panel; con 30 días de ventana y renovación a los 15, nadie pierde la sesión por esto.

- [ ] **Step 5: Escribir las Server Actions**

`src/modules/identity/actions.ts`:

```ts
'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { identity } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { guardedSignIn, type SignInOutcome } from './application/guarded-sign-in'
import { SESSION_COOKIE, sessionCookieOptions } from './session-cookie'

export type SignInActionState = { status: 'idle' | 'error'; message: SignInOutcome extends { message: infer M } ? M | '' : '' }

// Cinco intentos por minuto y por IP; tres por minuto y por cuenta.
const attempt = guardedSignIn({
  ipLimiter: createRateLimiter({ windowMs: 60_000, max: 5 }),
  accountLimiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
  signIn: (input) => identity.signIn(input),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
})

export async function signInAction(_previous: SignInActionState, formData: FormData): Promise<SignInActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })

  const outcome = await attempt({ ip, payload: Object.fromEntries(formData) })
  if (outcome.status === 'error') return { status: 'error', message: outcome.message }

  const jar = await cookies()
  jar.set(SESSION_COOKIE, outcome.token, sessionCookieOptions(outcome.expiresAt))
  redirect('/panel')
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token !== undefined) await identity.signOut(token)
  jar.delete(SESSION_COOKIE)
  redirect('/panel/entrar')
}
```

Cuidado: `redirect` lanza para hacer su trabajo, así que va **después** de escribir la cookie y nunca dentro de un `try`.

- [ ] **Step 6: Escribir la prueba del formulario**

`src/modules/identity/ui/SignInForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SignInForm } from './SignInForm'

vi.mock('../actions', () => ({ signInAction: vi.fn() }))

describe('SignInForm', () => {
  it('pide correo y contraseña', () => {
    render(<SignInForm />)
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('no ofrece registro ni recuperación: no existen', () => {
    render(<SignInForm />)
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/olvidé/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Ejecutar, ver fallar, escribir el formulario y la página**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/identity/ui` → FAIL.

`src/modules/identity/ui/SignInForm.tsx`:

```tsx
'use client'

import { useActionState, useId } from 'react'
import { signInAction, type SignInActionState } from '../actions'

const INITIAL: SignInActionState = { status: 'idle', message: '' }

const MESSAGES = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  too_many_attempts: 'Demasiados intentos. Espera un minuto.',
  storage_failure: 'No pudimos comprobar tus datos. Inténtalo en un momento.',
} as const

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, INITIAL)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const error = state.status === 'error' && state.message !== '' ? MESSAGES[state.message] : null

  return (
    <form action={formAction} className="flex w-full max-w-[380px] flex-col gap-5">
      <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" htmlFor={emailId}>
        Correo
        <input autoComplete="username" className={FIELD_CLASS} id={emailId} name="email" required type="email" />
      </label>

      <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" htmlFor={passwordId}>
        Contraseña
        <input autoComplete="current-password" className={FIELD_CLASS} id={passwordId} name="password" required type="password" />
      </label>

      {error ? (
        <p className="text-[13px] text-gold-deep" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
```

`src/app/(panel)/panel/entrar/page.tsx`:

```tsx
import { SignInForm } from '@/modules/identity/ui/SignInForm'

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <h1 className="font-display text-[28px] font-light text-ink">Panel del atelier</h1>
      <SignInForm />
    </div>
  )
}
```

`src/app/(panel)/panel/page.tsx` pasa a exigir sesión:

```tsx
import { signOutAction } from '@/modules/identity/actions'
import { requireSession } from '@/modules/identity/session-cookie'

export default async function PanelHomePage() {
  await requireSession()

  return (
    <div className="p-10">
      <h1 className="font-display text-[26px] font-light text-ink">Eventos</h1>
      <form action={signOutAction}>
        <button className="mt-6 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" type="submit">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
```

Volver a ejecutar → PASS.

- [ ] **Step 8: Comprobar el ciclo completo en el navegador**

```bash
DATABASE_URL=… SITE_URL=… pnpm dev
```

Verificar, en este orden: `/panel` sin cookie redirige a `/panel/entrar`; una contraseña mala muestra el mensaje y no crea cookie; la correcta lleva a `/panel`; recargar mantiene la sesión; "Cerrar sesión" vuelve a `/panel/entrar` y `/panel` deja de abrirse.

Si la escena queda en blanco o algo no reacciona, comprobar **antes de tocar código** que la pestaña está en primer plano: con `visibilityState: "hidden"` no disparan IntersectionObserver ni ResizeObserver (lección de la Task 11 del ciclo 1).

- [ ] **Step 9: Verificar y commit**

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(panel): inicio y cierre de sesión con límite por IP y por cuenta

La cookie es httpOnly, secure en producción y sameSite=lax. requireSession
redirige en vez de devolver null: así ninguna página del panel puede
olvidarse de comprobar la sesión."
```

---

### Task 7: Dominio y casos de uso de eventos

**Files:**
- Create: `src/modules/events/domain/errors.ts`, `src/modules/events/domain/event.ts`
- Create: `src/modules/events/application/ports.ts`, `create-event.ts`, `update-event.ts`, `list-events.ts`, `get-event-by-slug.ts`
- Create: `src/modules/events/index.ts`
- Test: `src/modules/events/domain/event.test.ts`, `src/modules/events/application/create-event.test.ts`

**Interfaces:**
- Produces:

```ts
export type EventStatus = 'draft' | 'live' | 'closed'

export type Event = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string      // ISO 'YYYY-MM-DD'
  readonly rsvpDeadline: string   // ISO 'YYYY-MM-DD'
  readonly locale: Locale
  readonly themeKey: string
  readonly status: EventStatus
  readonly retentionDays: number
}

createEvent(input: EventInput): Result<Event, EventError>
acceptsResponses(event: Event, today: string): boolean

export interface EventRepository {
  insert(event: Event): Promise<void>
  update(event: Event): Promise<void>
  listAll(): Promise<EventInput[]>
  findBySlug(slug: string): Promise<EventInput | null>
  findById(id: string): Promise<EventInput | null>
}

createEventUseCase = createEvent(deps: { events: EventRepository; ids: () => string })
```

`EventErrorKind`: `invalid_slug` · `invalid_title` · `invalid_date` · `deadline_after_event` · `invalid_locale` · `invalid_status` · `invalid_theme` · `duplicate_slug` · `not_found` · `storage_failure`.

- [ ] **Step 1: Escribir la prueba del dominio**

`src/modules/events/domain/event.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { acceptsResponses, createEvent } from './event'

const base = {
  id: 'e1',
  slug: 'boda-ana-y-luis',
  title: 'Boda de Ana y Luis',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
}

describe('createEvent', () => {
  it('construye un evento válido', () => {
    expect(isOk(createEvent(base))).toBe(true)
  })

  it('rechaza un slug con mayúsculas o espacios', () => {
    expect(isErr(createEvent({ ...base, slug: 'Boda Ana' }))).toBe(true)
  })

  it('rechaza una fecha límite posterior al evento', () => {
    const result = createEvent({ ...base, rsvpDeadline: '2026-12-06' })
    expect(isErr(result) && result.error.kind).toBe('deadline_after_event')
  })

  it('acepta que la fecha límite sea el mismo día del evento', () => {
    expect(isOk(createEvent({ ...base, rsvpDeadline: '2026-12-05' }))).toBe(true)
  })

  it('rechaza un idioma que no existe', () => {
    const result = createEvent({ ...base, locale: 'pt' })
    expect(isErr(result) && result.error.kind).toBe('invalid_locale')
  })

  it('rechaza un estado desconocido', () => {
    const result = createEvent({ ...base, status: 'publicado' })
    expect(isErr(result) && result.error.kind).toBe('invalid_status')
  })

  it('rechaza una retención de cero días o negativa', () => {
    expect(isErr(createEvent({ ...base, retentionDays: 0 }))).toBe(true)
  })
})

describe('acceptsResponses', () => {
  const live = createEvent(base)
  const evento = isOk(live) ? live.value : null

  it('acepta antes de la fecha límite y en el propio día', () => {
    expect(acceptsResponses(evento!, '2026-11-19')).toBe(true)
    expect(acceptsResponses(evento!, '2026-11-20')).toBe(true)
  })

  it('cierra al día siguiente de la fecha límite', () => {
    expect(acceptsResponses(evento!, '2026-11-21')).toBe(false)
  })

  it('no acepta si el evento está en borrador o cerrado', () => {
    const draft = createEvent({ ...base, status: 'draft' })
    const closed = createEvent({ ...base, status: 'closed' })
    expect(acceptsResponses(isOk(draft) ? draft.value : evento!, '2026-11-19')).toBe(false)
    expect(acceptsResponses(isOk(closed) ? closed.value : evento!, '2026-11-19')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar, ver fallar, escribir el dominio**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/events` → FAIL.

`src/modules/events/domain/errors.ts`: mismo patrón que `catalog/domain/errors.ts`, con los diez `EventErrorKind` listados arriba y la función `eventError(kind, detail)`.

`src/modules/events/domain/event.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { LOCALES, type Locale } from '@/shared/i18n/locales'
import { eventError, type EventError } from './errors'

export type EventStatus = 'draft' | 'live' | 'closed'

const STATUSES: readonly string[] = ['draft', 'live', 'closed']
const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type Event = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly rsvpDeadline: string
  readonly locale: Locale
  readonly themeKey: string
  readonly status: EventStatus
  readonly retentionDays: number
}

export type EventInput = {
  id: string
  slug: string
  title: string
  eventDate: string
  rsvpDeadline: string
  locale: string
  themeKey: string
  status: string
  retentionDays: number
}

export function createEvent(input: EventInput): Result<Event, EventError> {
  const slug = input.slug.trim()
  if (!SLUG_SHAPE.test(slug)) {
    return err(eventError('invalid_slug', `Slug inválido: "${input.slug}". Solo minúsculas, números y guiones.`))
  }

  const title = input.title.trim()
  if (title.length === 0 || title.length > 160) {
    return err(eventError('invalid_title', 'El título va de 1 a 160 caracteres'))
  }

  if (!ISO_DATE.test(input.eventDate) || !ISO_DATE.test(input.rsvpDeadline)) {
    return err(eventError('invalid_date', 'Las fechas van en formato YYYY-MM-DD'))
  }

  // Comparación lexicográfica: con ISO 'YYYY-MM-DD' equivale a la cronológica y no
  // arrastra la zona horaria que sí traería `new Date`.
  if (input.rsvpDeadline > input.eventDate) {
    return err(eventError('deadline_after_event', 'La fecha límite no puede ser posterior al evento'))
  }

  if (!(LOCALES as readonly string[]).includes(input.locale)) {
    return err(eventError('invalid_locale', `Idioma no soportado: ${input.locale}`))
  }

  if (!STATUSES.includes(input.status)) {
    return err(eventError('invalid_status', `Estado desconocido: ${input.status}`))
  }

  const themeKey = input.themeKey.trim()
  if (themeKey.length === 0) return err(eventError('invalid_theme', 'El evento necesita una plantilla'))

  if (!Number.isInteger(input.retentionDays) || input.retentionDays < 1) {
    return err(eventError('invalid_date', 'La retención se mide en días enteros y positivos'))
  }

  return ok({
    id: input.id,
    slug,
    title,
    eventDate: input.eventDate,
    rsvpDeadline: input.rsvpDeadline,
    locale: input.locale as Locale,
    themeKey,
    status: input.status as EventStatus,
    retentionDays: input.retentionDays,
  })
}

/** Solo un evento `live` y dentro del plazo acepta confirmaciones. */
export const acceptsResponses = (event: Event, today: string): boolean =>
  event.status === 'live' && today <= event.rsvpDeadline
```

- [ ] **Step 3: Escribir la prueba del caso de uso**

`src/modules/events/application/create-event.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createEventUseCase } from './create-event'
import type { EventRepository } from './ports'

const repo = (existing: string[] = []) => {
  const inserted: unknown[] = []
  const events: EventRepository = {
    insert: async (event) => void inserted.push(event),
    update: async () => {},
    listAll: async () => [],
    findBySlug: async (slug) => (existing.includes(slug) ? ({ slug } as never) : null),
    findById: async () => null,
  }
  return { events, inserted }
}

const input = {
  slug: 'boda-ana-y-luis',
  title: 'Boda de Ana y Luis',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'draft',
  retentionDays: 90,
}

describe('createEventUseCase', () => {
  it('inserta el evento con el id que genera', async () => {
    const { events, inserted } = repo()
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })(input)
    expect(isOk(result) && result.value.id).toBe('id-fijo')
    expect(inserted).toHaveLength(1)
  })

  it('rechaza un slug ya usado sin insertar nada', async () => {
    const { events, inserted } = repo(['boda-ana-y-luis'])
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })(input)
    expect(isErr(result) && result.error.kind).toBe('duplicate_slug')
    expect(inserted).toHaveLength(0)
  })

  it('no inserta cuando el dominio rechaza la entrada', async () => {
    const { events, inserted } = repo()
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })({ ...input, rsvpDeadline: '2027-01-01' })
    expect(isErr(result)).toBe(true)
    expect(inserted).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Escribir los puertos y los cuatro casos de uso**

`src/modules/events/application/ports.ts` — la interfaz `EventRepository` del bloque **Interfaces**.

`src/modules/events/application/create-event.ts`:

```ts
import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { createEvent, type Event, type EventInput } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export const createEventUseCase =
  (deps: { events: EventRepository; ids: () => string }) =>
  async (input: Omit<EventInput, 'id'>): Promise<Result<Event, EventError>> =>
    attempt(async () => {
      const event = createEvent({ ...input, id: deps.ids() })
      if (isErr(event)) return event

      // El índice único de la base es la última palabra, pero comprobar antes permite
      // devolver `duplicate_slug` en vez de un fallo de almacenamiento sin sentido.
      if (await deps.events.findBySlug(event.value.slug)) {
        return err(eventError('duplicate_slug', `Ya existe un evento con el slug ${event.value.slug}`))
      }

      await deps.events.insert(event.value)
      return ok(event.value)
    }, (cause) => eventError('storage_failure', `No se pudo crear el evento: ${String(cause)}`))
```

`update-event.ts` — misma forma: reconstruye por dominio con el `id` recibido, comprueba que el slug, si cambió, no lo tenga otro evento, y llama a `events.update`.

`list-events.ts` y `get-event-by-slug.ts` — misma forma que `listPlans` y `getTemplate` de `catalog`: leen filas, las pasan por `createEvent`, y `get-event-by-slug` devuelve `err(eventError('not_found', …))` cuando el repositorio da `null`.

`src/modules/events/index.ts` exporta los tipos `Event`, `EventStatus`, `EventError` y el puerto `EventRepository`.

- [ ] **Step 5: Ejecutar y ver que pasa todo**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/events`
Expected: PASS (13 pruebas).

- [ ] **Step 6: Commit**

```bash
git add src/modules/events
git commit -m "feat(events): dominio del evento con plazo de RSVP y casos de uso"
```

---

### Task 8: Bandeja del panel y alta de eventos

**Files:**
- Create: `src/modules/events/infrastructure/drizzle-event-repository.ts`
- Create: `src/modules/events/actions.ts`
- Create: `src/modules/events/ui/EventForm.tsx`, `src/modules/events/ui/EventList.tsx`
- Create: `src/modules/events/ui/themes/registry.ts`, `src/modules/events/ui/themes/ClasicoTheme.tsx`
- Create: `src/app/(panel)/panel/eventos/nuevo/page.tsx`
- Modify: `src/app/(panel)/panel/page.tsx`, `src/app/composition/container.ts`
- Test: `src/modules/events/infrastructure/drizzle-event-repository.test.ts`, `src/modules/events/ui/EventList.test.tsx`, `src/modules/events/ui/themes/registry.test.ts`

**Interfaces:**
- Consumes: `EventRepository` y los cuatro casos de uso (Task 7); `requireSession` (Task 6).
- Produces:
  - `drizzleEventRepository`, `createDrizzleEventRepository(db)`
  - `createEventAction(previous, formData)`, `updateEventAction(previous, formData)`
  - `themeFor(key: string): InvitationTheme` con `InvitationTheme = { key: string; label: string; Component: ComponentType<{ event: Event; children: ReactNode }> }`
  - `THEME_KEYS: readonly string[]` para poblar el desplegable del formulario.

- [ ] **Step 1: Escribir la prueba del registro de plantillas**

`src/modules/events/ui/themes/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { THEME_KEYS, themeFor } from './registry'

describe('registro de plantillas', () => {
  it('devuelve la plantilla pedida', () => {
    expect(themeFor('clasico').key).toBe('clasico')
  })

  it('cae en clásico cuando la clave no existe, en vez de romper la invitación', () => {
    expect(themeFor('inventada').key).toBe('clasico')
  })

  it('expone todas las claves para el desplegable del panel', () => {
    expect(THEME_KEYS).toContain('clasico')
    expect(THEME_KEYS.every((key) => themeFor(key).key === key)).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar, ver fallar, escribir el registro**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/events/ui/themes` → FAIL.

`src/modules/events/ui/themes/registry.ts`:

```ts
import type { ComponentType, ReactNode } from 'react'
import type { Event } from '../../domain/event'
import { ClasicoTheme } from './ClasicoTheme'

export type ThemeProps = { event: Event; children: ReactNode }
export type InvitationTheme = { readonly key: string; readonly label: string; readonly Component: ComponentType<ThemeProps> }

/**
 * La invitación se compone a mano (sección 11 del spec): cada pieza entra aquí como un
 * componente con su clave. `themeKey` en la base es solo texto, así que una clave
 * borrada de este registro dejaría la invitación en blanco; por eso hay respaldo.
 */
const THEMES = {
  clasico: { key: 'clasico', label: 'Clásico marfil', Component: ClasicoTheme },
} as const satisfies Record<string, InvitationTheme>

export const THEME_KEYS = Object.keys(THEMES) as ReadonlyArray<keyof typeof THEMES>

export const themeFor = (key: string): InvitationTheme =>
  (THEMES as Record<string, InvitationTheme>)[key] ?? THEMES.clasico
```

`src/modules/events/ui/themes/ClasicoTheme.tsx`:

```tsx
import type { ThemeProps } from './registry'

const LOCALE_TAG = { es: 'es-BO', en: 'en-US' } as const

export function ClasicoTheme({ event, children }: ThemeProps) {
  const fecha = new Date(`${event.eventDate}T12:00:00Z`).toLocaleDateString(LOCALE_TAG[event.locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <article className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{fecha}</p>
      <h1 className="font-display text-[38px] font-light leading-[1.15] text-ink">{event.title}</h1>
      <div className="h-px w-16 bg-[var(--color-line)]" />
      {children}
    </article>
  )
}
```

`children` es el bloque de RSVP que inyecta la Task 13: la plantilla no lo conoce.

Volver a ejecutar → PASS (3 pruebas).

- [ ] **Step 3: Escribir la prueba del repositorio**

`src/modules/events/infrastructure/drizzle-event-repository.test.ts` — mismo patrón de transacción revertida que la Task 2:

```ts
it('inserta, encuentra por slug y actualiza', async () => {
  await inRolledBackTransaction(async (tx) => {
    const repo = createDrizzleEventRepository(tx)
    const evento = {
      id: crypto.randomUUID(),
      slug: 'boda-repo',
      title: 'Boda repo',
      eventDate: '2026-12-05',
      rsvpDeadline: '2026-11-20',
      locale: 'es' as const,
      themeKey: 'clasico',
      status: 'draft' as const,
      retentionDays: 90,
    }

    await repo.insert(evento)
    expect((await repo.findBySlug('boda-repo'))?.title).toBe('Boda repo')

    await repo.update({ ...evento, status: 'live' })
    expect((await repo.findBySlug('boda-repo'))?.status).toBe('live')

    expect(await repo.findBySlug('no-existe')).toBeNull()
  })
})
```

- [ ] **Step 4: Escribir el repositorio**

`src/modules/events/infrastructure/drizzle-event-repository.ts`: `insert` escribe la fila con el `id` que trae el dominio; `update` hace `set` de todas las columnas editables `where eq(events.id, event.id)`; `listAll` ordena por `events.eventDate` ascendente; `findBySlug`/`findById` devuelven `row ?? null`. Las columnas `date` de Drizzle ya devuelven `string` en formato ISO, así que no hay conversión.

Ejecutar → PASS.

- [ ] **Step 5: Escribir las acciones del panel**

`src/modules/events/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { events as eventsUseCases } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
import type { EventErrorKind } from './domain/errors'

export type EventActionState = { status: 'idle' | 'error' | 'success'; message: EventErrorKind | '' }

const readForm = (formData: FormData) => ({
  slug: String(formData.get('slug') ?? ''),
  title: String(formData.get('title') ?? ''),
  eventDate: String(formData.get('eventDate') ?? ''),
  rsvpDeadline: String(formData.get('rsvpDeadline') ?? ''),
  locale: String(formData.get('locale') ?? 'es'),
  themeKey: String(formData.get('themeKey') ?? 'clasico'),
  status: String(formData.get('status') ?? 'draft'),
  retentionDays: Number(formData.get('retentionDays') ?? 90),
})

export async function createEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  await requireSession()

  const result = await eventsUseCases.create(readForm(formData))
  if (isErr(result)) {
    console.error('alta de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath('/panel')
  return { status: 'success', message: '' }
}
```

`updateEventAction` es igual, lee además `id` del formulario y llama a `eventsUseCases.update`, y revalida `/panel` y `/panel/eventos/${slug}`.

Cada acción empieza por `requireSession()`: una Server Action es un extremo HTTP público, y el hecho de que el formulario viva tras el inicio de sesión no la protege.

- [ ] **Step 6: Componer, escribir la interfaz y las páginas**

En `container.ts`:

```ts
export const events = {
  create: createEventUseCase({ events: drizzleEventRepository, ids: () => crypto.randomUUID() }),
  update: updateEventUseCase({ events: drizzleEventRepository }),
  list: listEvents({ events: drizzleEventRepository }),
  getBySlug: getEventBySlug({ events: drizzleEventRepository }),
} as const
```

`EventForm.tsx` es un componente cliente con `useActionState`, campos `slug`, `title`, `eventDate` y `rsvpDeadline` (`type="date"`), `locale` (es/en), `themeKey` (poblado con `THEME_KEYS`), `status` (draft/live/closed) y `retentionDays` (número). Mensajes de error en español, uno por `EventErrorKind`.

`EventList.tsx` es un Server Component: recibe `events: readonly Event[]`, los pinta como tarjetas con título, fecha, estado y enlace a `/panel/eventos/{slug}`, y muestra "Todavía no hay eventos" cuando la lista viene vacía.

`src/app/(panel)/panel/page.tsx` pasa a `await requireSession()`, leer `events.list()` y renderizar `<EventList>`; ante `isErr` muestra un aviso de que la base no responde en vez de romper.

`src/app/(panel)/panel/eventos/nuevo/page.tsx` exige sesión y monta `<EventForm>`.

- [ ] **Step 7: Escribir la prueba de la lista**

`src/modules/events/ui/EventList.test.tsx`: dos casos — con dos eventos, muestra ambos títulos y sus enlaces; con lista vacía, muestra el aviso.

- [ ] **Step 8: Verificar en el navegador y commit**

Crear un evento desde `/panel/eventos/nuevo`, verlo en `/panel`, repetir el mismo slug y comprobar el mensaje de duplicado.

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(events): bandeja del panel, alta de eventos y registro de plantillas

Las Server Actions comprueban la sesión por su cuenta: son extremos HTTP
públicos, y estar tras el formulario del panel no las protege."
```

---

### Task 9: Dominio y casos de uso de grupos de invitados

**Files:**
- Create: `src/modules/guests/domain/errors.ts`, `guest-group.ts`
- Create: `src/modules/guests/application/ports.ts`, `add-guest-group.ts`, `list-guest-groups.ts`, `revoke-invitation.ts`, `resolve-by-token.ts`
- Create: `src/modules/guests/index.ts`
- Test: `src/modules/guests/domain/guest-group.test.ts`, `src/modules/guests/application/add-guest-group.test.ts`, `resolve-by-token.test.ts`

**Interfaces:**
- Consumes: `Minter` de `@/shared/security/tokens` (Task 5).
- Produces:

```ts
export type GuestGroup = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly seats: number
  readonly revokedAt: Date | null
}

createGuestGroup(input: GuestGroupInput): Result<GuestGroup, GuestError>
isRevoked(group: GuestGroup): boolean

export interface GuestGroupRepository {
  insert(group: GuestGroup, tokenHash: Buffer): Promise<void>
  listByEvent(eventId: string): Promise<GuestGroupInput[]>
  findByTokenHash(tokenHash: Buffer): Promise<GuestGroupInput | null>
  revoke(id: string, at: Date): Promise<void>
  markOpened(id: string, at: Date): Promise<void>
}

addGuestGroup(deps)(input: { eventId: string; label: string; seats: number }): Promise<Result<{ group: GuestGroup; token: string }, GuestError>>
resolveByToken(deps)(token: string): Promise<Result<GuestGroup, GuestError>>
```

`GuestErrorKind`: `invalid_label` · `invalid_seats` · `not_found` · `revoked` · `storage_failure`.

- [ ] **Step 1: Escribir la prueba del dominio**

`src/modules/guests/domain/guest-group.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createGuestGroup, isRevoked } from './guest-group'

const base = { id: 'g1', eventId: 'e1', label: 'Familia Rojas Peña', seats: 4, revokedAt: null }

describe('createGuestGroup', () => {
  it('construye un grupo válido', () => {
    expect(isOk(createGuestGroup(base))).toBe(true)
  })

  it('una persona sola es un grupo de un cupo', () => {
    expect(isOk(createGuestGroup({ ...base, label: 'Daniela Ortiz', seats: 1 }))).toBe(true)
  })

  it('rechaza cero cupos: un grupo sin cupos no es una invitación', () => {
    const result = createGuestGroup({ ...base, seats: 0 })
    expect(isErr(result) && result.error.kind).toBe('invalid_seats')
  })

  it('rechaza cupos fraccionarios', () => {
    expect(isErr(createGuestGroup({ ...base, seats: 2.5 }))).toBe(true)
  })

  it('rechaza una etiqueta vacía o de más de 160 caracteres', () => {
    expect(isErr(createGuestGroup({ ...base, label: '   ' }))).toBe(true)
    expect(isErr(createGuestGroup({ ...base, label: 'x'.repeat(161) }))).toBe(true)
  })

  it('recorta los espacios de la etiqueta', () => {
    const result = createGuestGroup({ ...base, label: '  Familia Rojas  ' })
    expect(isOk(result) && result.value.label).toBe('Familia Rojas')
  })
})

describe('isRevoked', () => {
  it('distingue un grupo vivo de uno revocado', () => {
    const vivo = createGuestGroup(base)
    const muerto = createGuestGroup({ ...base, revokedAt: new Date('2026-08-01T00:00:00Z') })
    expect(isOk(vivo) && isRevoked(vivo.value)).toBe(false)
    expect(isOk(muerto) && isRevoked(muerto.value)).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar, ver fallar, escribir el dominio**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/guests` → FAIL.

`src/modules/guests/domain/guest-group.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from './errors'

export type GuestGroup = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly seats: number
  readonly revokedAt: Date | null
}

export type GuestGroupInput = { id: string; eventId: string; label: string; seats: number; revokedAt: Date | null }

const MAX_LABEL = 160

/**
 * La unidad invitada es el grupo, no la persona: en Bolivia se invita a "Familia Rojas
 * Peña, 4 cupos". Una persona sola es un grupo de un cupo — un solo camino de código.
 */
export function createGuestGroup(input: GuestGroupInput): Result<GuestGroup, GuestError> {
  const label = input.label.trim()
  if (label.length === 0 || label.length > MAX_LABEL) {
    return err(guestError('invalid_label', `La etiqueta va de 1 a ${MAX_LABEL} caracteres`))
  }

  if (!Number.isInteger(input.seats) || input.seats < 1) {
    return err(guestError('invalid_seats', `Cupos inválidos: ${input.seats}. Un grupo sin cupos no es una invitación.`))
  }

  return ok({ id: input.id, eventId: input.eventId, label, seats: input.seats, revokedAt: input.revokedAt })
}

export const isRevoked = (group: GuestGroup): boolean => group.revokedAt !== null
```

- [ ] **Step 3: Escribir las pruebas de los casos de uso**

`src/modules/guests/application/add-guest-group.test.ts` — comprueba que devuelve el token en claro una sola vez y que lo que llega al repositorio es el **hash**, nunca el token:

```ts
it('guarda el hash y devuelve el token en claro', async () => {
  const guardado: Array<{ hash: Buffer }> = []
  const result = await addGuestGroup({
    groups: { ...repoVacio, insert: async (_group, tokenHash) => void guardado.push({ hash: tokenHash }) },
    minter: { mint: () => ({ token: 'token-visible', hash: Buffer.alloc(32, 3) }), hashOf: () => Buffer.alloc(32, 3) },
    ids: () => 'g1',
  })({ eventId: 'e1', label: 'Familia Rojas', seats: 4 })

  expect(isOk(result) && result.value.token).toBe('token-visible')
  expect(guardado[0]?.hash.equals(Buffer.alloc(32, 3))).toBe(true)
})
```

`src/modules/guests/application/resolve-by-token.test.ts` — tres casos: token desconocido da `not_found`; grupo revocado da `revoked`; grupo vivo devuelve el grupo y marca `openedAt` **solo la primera vez**.

- [ ] **Step 4: Escribir los casos de uso**

`add-guest-group.ts` acuña el token, construye el grupo por dominio y llama a `insert(group, hash)`; devuelve `{ group, token }`.

`resolve-by-token.ts`:

```ts
export const resolveByToken =
  (deps: { groups: GuestGroupRepository; minter: Minter; clock: () => Date }) =>
  async (token: string): Promise<Result<GuestGroup, GuestError>> =>
    attempt(async () => {
      const row = await deps.groups.findByTokenHash(deps.minter.hashOf(token))
      // Un token desconocido y uno revocado no se distinguen desde fuera: ambos acaban
      // en 404 en la página. Aquí se separan solo para el registro del servidor.
      if (row === null) return err(guestError('not_found', 'Token sin grupo'))

      const group = createGuestGroup(row)
      if (isErr(group)) return group
      if (isRevoked(group.value)) return err(guestError('revoked', `Invitación revocada: ${group.value.id}`))

      // `opened_at` es telemetría de infraestructura, no dominio: se escribe una sola
      // vez y ninguna regla de negocio depende de ella.
      if (row.openedAt === null) await deps.groups.markOpened(group.value.id, deps.clock())

      return ok(group.value)
    }, (cause) => guestError('storage_failure', `No se pudo resolver el token: ${String(cause)}`))
```

`GuestGroupInput` que devuelve el repositorio lleva además `openedAt: Date | null`, que el dominio ignora.

`list-guest-groups.ts` y `revoke-invitation.ts` siguen el patrón de `catalog`.

- [ ] **Step 5: Ejecutar y commit**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/guests` → PASS.

```bash
git add src/modules/guests
git commit -m "feat(guests): grupos con cupos y resolución por token

El caso de uso devuelve el token en claro una sola vez; al repositorio solo
llega su hash."
```

---

### Task 10: Panel del evento — grupos, enlaces y revocación

**Files:**
- Create: `src/modules/guests/infrastructure/drizzle-guest-group-repository.ts`
- Create: `src/modules/guests/actions.ts`
- Create: `src/modules/guests/ui/GuestGroupForm.tsx`, `src/modules/guests/ui/GuestGroupTable.tsx`, `src/modules/guests/ui/CopyLinkButton.tsx`
- Create: `src/app/(panel)/panel/eventos/[slug]/page.tsx`
- Modify: `src/app/composition/container.ts`
- Test: `src/modules/guests/infrastructure/drizzle-guest-group-repository.test.ts`, `src/modules/guests/ui/GuestGroupTable.test.tsx`

**Interfaces:**
- Consumes: `addGuestGroup`, `listGuestGroups`, `revokeInvitation` (Task 9); `requireSession` (Task 6); `events.getBySlug` (Task 8).
- Produces:
  - `drizzleGuestGroupRepository`, `createDrizzleGuestGroupRepository(db)`
  - `addGuestGroupAction(previous, formData)` → devuelve `{ status: 'success', token }` para que el panel pueda enseñar el enlace **una vez**
  - `revokeInvitationAction(formData)`
  - `invitationUrl(token: string): string` en `src/modules/guests/domain/invitation-url.ts`, construida sobre `env.SITE_URL`

- [ ] **Step 1: Escribir la prueba del repositorio**

`src/modules/guests/infrastructure/drizzle-guest-group-repository.test.ts`, con transacción revertida: inserta un evento y dos grupos, comprueba que `listByEvent` los trae en orden de creación, que `findByTokenHash` encuentra por hash y devuelve `null` con un hash desconocido, que `revoke` fija `revokedAt` y que `markOpened` solo escribe la primera vez.

- [ ] **Step 2: Ejecutar, ver fallar, escribir el repositorio**

`src/modules/guests/infrastructure/drizzle-guest-group-repository.ts` con el patrón de `createDrizzle…Repository(database: DbExecutor)` y la instancia por defecto sobre `db`. `insert` recibe `(group, tokenHash)` y escribe ambas cosas en la misma fila. `markOpened` usa `where` con `isNull(guestGroups.openedAt)` para que una segunda apertura no reescriba la marca.

- [ ] **Step 3: Escribir la URL de invitación con su prueba**

`src/modules/guests/domain/invitation-url.test.ts`:

```ts
it('construye la URL con el token, sin barra doble', () => {
  expect(invitationUrl('abc123', 'https://invitepremium.bo/')).toBe('https://invitepremium.bo/i/abc123')
})
```

`src/modules/guests/domain/invitation-url.ts`:

```ts
export const invitationUrl = (token: string, siteUrl: string): string =>
  `${siteUrl.replace(/\/+$/, '')}/i/${token}`
```

El dominio no puede importar `env` (`shared` sí, pero la URL del sitio es un dato de entorno que entra por argumento, como el reloj).

- [ ] **Step 4: Escribir las acciones**

`src/modules/guests/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { guests } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import { invitationUrl } from './domain/invitation-url'
import type { GuestErrorKind } from './domain/errors'

export type AddGuestGroupState =
  | { status: 'idle' }
  // El enlace viaja al cliente una sola vez, justo tras crearlo: después ya no existe
  // en ninguna parte, porque en la base solo queda el hash.
  | { status: 'success'; label: string; url: string }
  | { status: 'error'; message: GuestErrorKind }

export async function addGuestGroupAction(_previous: AddGuestGroupState, formData: FormData): Promise<AddGuestGroupState> {
  await requireSession()

  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')
  const result = await guests.add({
    eventId,
    label: String(formData.get('label') ?? ''),
    seats: Number(formData.get('seats') ?? 0),
  })

  if (isErr(result)) {
    console.error('alta de grupo rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return { status: 'success', label: result.value.group.label, url: invitationUrl(result.value.token, env.SITE_URL) }
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await requireSession()
  await guests.revoke(String(formData.get('groupId') ?? ''))
  revalidatePath(`/panel/eventos/${String(formData.get('eventSlug') ?? '')}`)
}
```

- [ ] **Step 5: Escribir la prueba de la tabla**

`src/modules/guests/ui/GuestGroupTable.test.tsx`:

```tsx
it('muestra los cupos y marca los revocados', () => {
  render(
    <GuestGroupTable
      eventSlug="boda"
      groups={[
        { id: 'g1', label: 'Familia Rojas', seats: 4, revokedAt: null, confirmed: 3, responded: true },
        { id: 'g2', label: 'Camila Vargas', seats: 1, revokedAt: new Date('2026-08-01'), confirmed: 0, responded: false },
      ]}
    />,
  )

  expect(screen.getByText('Familia Rojas')).toBeInTheDocument()
  expect(screen.getByText('3 / 4')).toBeInTheDocument()
  expect(screen.getByText('Revocada')).toBeInTheDocument()
  // El enlace no se puede volver a mostrar: solo existía al crearlo.
  expect(screen.queryByRole('button', { name: /copiar enlace/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 6: Escribir la interfaz y la página**

`GuestGroupTable.tsx` (Server Component) pinta etiqueta, cupos confirmados sobre asignados, estado (`Pendiente` / `Confirmada` / `Revocada`) y un formulario por fila con `revokeInvitationAction`. No muestra enlaces: ya no existen.

`GuestGroupForm.tsx` (cliente, `useActionState`) tiene `label`, `seats` (número, mínimo 1) y campos ocultos `eventId` y `eventSlug`. Cuando el estado es `success`, muestra el enlace recién creado dentro de un `<CopyLinkButton url={…} />` y un aviso: **"Cópialo ahora: no podremos volver a mostrarlo."**

`CopyLinkButton.tsx` (cliente) usa `navigator.clipboard.writeText` y, si falla o no existe, deja el enlace visible en un `<input readOnly>` seleccionable — sin `alert`, que bloquearía la página.

`src/app/(panel)/panel/eventos/[slug]/page.tsx` exige sesión, resuelve el evento con `events.getBySlug`, responde `notFound()` si no existe, y monta el formulario, la tabla y (Task 12) la franja de contadores.

- [ ] **Step 7: Comprobar en el navegador**

Crear un grupo, copiar el enlace, recargar: el enlace ya no aparece. Revocar uno y ver la marca. Intentar cupos `0` y ver el mensaje.

- [ ] **Step 8: Verificar y commit**

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(guests): panel del evento con alta de grupos, enlace único y revocación

El enlace se muestra una sola vez, al crearlo: en la base solo queda el
hash, así que ni el propio panel puede reconstruirlo."
```

---

### Task 11: Dominio del RSVP

**Files:**
- Create: `src/modules/rsvp/domain/errors.ts`, `rsvp-response.ts`, `tally.ts`
- Create: `src/modules/rsvp/index.ts`
- Test: `src/modules/rsvp/domain/rsvp-response.test.ts`, `src/modules/rsvp/domain/tally.test.ts`

**Interfaces:**
- Produces:

```ts
export type RsvpResponse = {
  readonly id: string
  readonly guestGroupId: string
  readonly attending: number
  readonly message: string | null
  readonly respondedAt: Date
}

export type RsvpTally = {
  readonly seatsInvited: number
  readonly seatsConfirmed: number
  readonly groupsResponded: number
  readonly groupsPending: number
}

createRsvpResponse(input, limits: { seats: number }): Result<RsvpResponse, RsvpError>
tallyOf(rows: ReadonlyArray<{ seats: number; attending: number | null }>): RsvpTally
```

`RsvpErrorKind`, exactamente los siete del spec: `invitation_not_found` · `invitation_revoked` · `rsvp_closed` · `too_many_seats` · `invalid_payload` · `storage_failure` · `rate_limited`.

- [ ] **Step 1: Escribir las pruebas**

`src/modules/rsvp/domain/rsvp-response.test.ts`:

```ts
const base = { id: 'r1', guestGroupId: 'g1', attending: 3, message: null, respondedAt: new Date('2026-08-19T12:00:00Z') }

it('acepta confirmar menos cupos de los asignados', () => {
  expect(isOk(createRsvpResponse(base, { seats: 4 }))).toBe(true)
})

it('acepta cero: no asistir es una respuesta, no un silencio', () => {
  expect(isOk(createRsvpResponse({ ...base, attending: 0 }, { seats: 4 }))).toBe(true)
})

it('rechaza confirmar más cupos de los asignados', () => {
  const result = createRsvpResponse({ ...base, attending: 5 }, { seats: 4 })
  expect(isErr(result) && result.error.kind).toBe('too_many_seats')
})

it('rechaza un número negativo o fraccionario', () => {
  expect(isErr(createRsvpResponse({ ...base, attending: -1 }, { seats: 4 }))).toBe(true)
  expect(isErr(createRsvpResponse({ ...base, attending: 1.5 }, { seats: 4 }))).toBe(true)
})

it('recorta el mensaje y lo deja en null si queda vacío', () => {
  const result = createRsvpResponse({ ...base, message: '   ' }, { seats: 4 })
  expect(isOk(result) && result.value.message).toBeNull()
})

it('rechaza un mensaje de más de 500 caracteres', () => {
  const result = createRsvpResponse({ ...base, message: 'x'.repeat(501) }, { seats: 4 })
  expect(isErr(result) && result.error.kind).toBe('invalid_payload')
})
```

`src/modules/rsvp/domain/tally.test.ts`:

```ts
it('cuenta cupos invitados, confirmados, respondidos y pendientes', () => {
  const tally = tallyOf([
    { seats: 4, attending: 3 },
    { seats: 2, attending: 0 },
    { seats: 1, attending: null },
  ])

  expect(tally).toEqual({ seatsInvited: 7, seatsConfirmed: 3, groupsResponded: 2, groupsPending: 1 })
})

it('un grupo que respondió cero cuenta como respondido, no como pendiente', () => {
  expect(tallyOf([{ seats: 3, attending: 0 }])).toMatchObject({ groupsResponded: 1, groupsPending: 0 })
})

it('sin grupos, todo en cero', () => {
  expect(tallyOf([])).toEqual({ seatsInvited: 0, seatsConfirmed: 0, groupsResponded: 0, groupsPending: 0 })
})
```

- [ ] **Step 2: Ejecutar, ver fallar, escribir el dominio**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/rsvp` → FAIL.

`src/modules/rsvp/domain/rsvp-response.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from './errors'

const MAX_MESSAGE = 500

export type RsvpResponse = {
  readonly id: string
  readonly guestGroupId: string
  readonly attending: number
  readonly message: string | null
  readonly respondedAt: Date
}

export type RsvpResponseInput = {
  id: string
  guestGroupId: string
  attending: number
  message: string | null
  respondedAt: Date
}

export function createRsvpResponse(input: RsvpResponseInput, limits: { seats: number }): Result<RsvpResponse, RsvpError> {
  if (!Number.isInteger(input.attending) || input.attending < 0) {
    return err(rsvpError('invalid_payload', `Asistentes inválidos: ${input.attending}`))
  }

  if (input.attending > limits.seats) {
    return err(rsvpError('too_many_seats', `${input.attending} asistentes para ${limits.seats} cupos`))
  }

  const trimmed = input.message?.trim() ?? ''
  if (trimmed.length > MAX_MESSAGE) {
    return err(rsvpError('invalid_payload', `El mensaje pasa de ${MAX_MESSAGE} caracteres`))
  }

  return ok({
    id: input.id,
    guestGroupId: input.guestGroupId,
    attending: input.attending,
    message: trimmed.length === 0 ? null : trimmed,
    respondedAt: input.respondedAt,
  })
}
```

`src/modules/rsvp/domain/tally.ts`:

```ts
export type RsvpTally = {
  readonly seatsInvited: number
  readonly seatsConfirmed: number
  readonly groupsResponded: number
  readonly groupsPending: number
}

/**
 * `attending: null` significa que el grupo todavía no respondió. Un cero es una
 * respuesta —"no vamos"— y por eso cuenta como respondido: confundirlos haría que el
 * atelier persiguiera a quien ya contestó.
 */
export function tallyOf(rows: ReadonlyArray<{ seats: number; attending: number | null }>): RsvpTally {
  let seatsInvited = 0
  let seatsConfirmed = 0
  let groupsResponded = 0

  for (const row of rows) {
    seatsInvited += row.seats
    if (row.attending === null) continue
    seatsConfirmed += row.attending
    groupsResponded += 1
  }

  return { seatsInvited, seatsConfirmed, groupsResponded, groupsPending: rows.length - groupsResponded }
}
```

- [ ] **Step 3: Ejecutar, ver verde, commit**

Run: `DATABASE_URL=… SITE_URL=… pnpm vitest run src/modules/rsvp` → PASS (9 pruebas).

```bash
git add src/modules/rsvp
git commit -m "feat(rsvp): respuesta con cupos acotados y conteo del evento"
```

---

### Task 12: Casos de uso e infraestructura del RSVP

**Files:**
- Create: `src/modules/rsvp/application/ports.ts`, `respond-to-invitation.ts`, `get-tally.ts`
- Create: `src/modules/rsvp/infrastructure/drizzle-rsvp-repository.ts`
- Create: `src/modules/rsvp/ui/TallyStrip.tsx`
- Modify: `src/app/composition/container.ts`, `src/app/(panel)/panel/eventos/[slug]/page.tsx`
- Test: `src/modules/rsvp/application/respond-to-invitation.test.ts`, `src/modules/rsvp/infrastructure/drizzle-rsvp-repository.test.ts`

**Interfaces:**
- Consumes: `resolveByToken` (Task 9), `acceptsResponses` (Task 7), `createRsvpResponse` y `tallyOf` (Task 11).
- Produces:

```ts
export interface RsvpRepository {
  append(response: RsvpResponse): Promise<void>
  latestFor(guestGroupId: string): Promise<{ attending: number; message: string | null; respondedAt: Date } | null>
  tallyRowsFor(eventId: string): Promise<Array<{ seats: number; attending: number | null }>>
}

respondToInvitation(deps)(input: { token: string; attending: number; message: string | null }): Promise<Result<RsvpResponse, RsvpError>>
getTally(deps)(eventId: string): Promise<Result<RsvpTally, RsvpError>>
```

- [ ] **Step 1: Escribir la prueba del caso de uso**

`src/modules/rsvp/application/respond-to-invitation.test.ts`, con dobles en memoria:

```ts
it('anexa una respuesta nueva, sin actualizar la anterior', async () => {
  const anexadas: RsvpResponse[] = []
  const responder = respondToInvitation({ ...deps, rsvp: { ...rsvpVacio, append: async (r) => void anexadas.push(r) } })

  await responder({ token: 'tok', attending: 3, message: null })
  await responder({ token: 'tok', attending: 2, message: 'Al final somos dos' })

  expect(anexadas.map((r) => r.attending)).toEqual([3, 2])
})

it('rechaza pasada la fecha límite', async () => {
  const result = await respondToInvitation({ ...deps, clock: () => new Date('2026-11-21T12:00:00Z') })({ token: 'tok', attending: 1, message: null })
  expect(isErr(result) && result.error.kind).toBe('rsvp_closed')
})

it('rechaza una invitación revocada', async () => { /* resolveByToken devuelve err('revoked') */ })
it('traduce un token desconocido a invitation_not_found', async () => { /* … */ })
it('rechaza más asistentes que cupos', async () => { /* attending: 5, seats: 4 → too_many_seats */ })
it('no consulta el evento si el token no resuelve', async () => { /* el doble de eventos cuenta llamadas */ })
```

- [ ] **Step 2: Escribir el caso de uso**

`src/modules/rsvp/application/respond-to-invitation.ts`:

```ts
export const respondToInvitation =
  (deps: {
    resolveGroup: (token: string) => Promise<Result<GuestGroup, GuestError>>
    findEventById: (id: string) => Promise<Result<Event, EventError>>
    rsvp: RsvpRepository
    ids: () => string
    clock: () => Date
  }) =>
  async (input: { token: string; attending: number; message: string | null }): Promise<Result<RsvpResponse, RsvpError>> =>
    attempt(async () => {
      const group = await deps.resolveGroup(input.token)
      if (isErr(group)) {
        return err(
          group.error.kind === 'revoked'
            ? rsvpError('invitation_revoked', group.error.detail)
            : rsvpError('invitation_not_found', group.error.detail),
        )
      }

      const event = await deps.findEventById(group.value.eventId)
      if (isErr(event)) return err(rsvpError('storage_failure', event.error.detail))

      const now = deps.clock()
      // El plazo se mide en la fecha del evento, no en la del servidor con su hora:
      // el corte es el día completo.
      const today = now.toISOString().slice(0, 10)
      if (!acceptsResponses(event.value, today)) {
        return err(rsvpError('rsvp_closed', `Evento ${event.value.slug} cerrado el ${event.value.rsvpDeadline}`))
      }

      const response = createRsvpResponse(
        { id: deps.ids(), guestGroupId: group.value.id, attending: input.attending, message: input.message, respondedAt: now },
        { seats: group.value.seats },
      )
      if (isErr(response)) return response

      await deps.rsvp.append(response.value)
      return ok(response.value)
    }, (cause) => rsvpError('storage_failure', `No se pudo registrar la respuesta: ${String(cause)}`))
```

- [ ] **Step 3: Escribir la prueba del repositorio y el repositorio**

`drizzle-rsvp-repository.test.ts`, en transacción revertida: anexa dos respuestas al mismo grupo y comprueba que `latestFor` devuelve la **más reciente** y que siguen existiendo dos filas; comprueba que `tallyRowsFor` devuelve `attending: null` para un grupo sin respuesta.

`drizzle-rsvp-repository.ts`: `append` inserta; `latestFor` ordena por `respondedAt desc` con `limit 1`; `tallyRowsFor` hace `leftJoin` lateral del grupo con su última respuesta:

```ts
async tallyRowsFor(eventId) {
  const latest = database
    .selectDistinctOn([rsvpResponses.guestGroupId], {
      guestGroupId: rsvpResponses.guestGroupId,
      attending: rsvpResponses.attending,
    })
    .from(rsvpResponses)
    .orderBy(rsvpResponses.guestGroupId, desc(rsvpResponses.respondedAt))
    .as('latest')

  return database
    .select({ seats: guestGroups.seats, attending: latest.attending })
    .from(guestGroups)
    .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
    // Un grupo revocado ya no cuenta como invitado: sus cupos no se van a ocupar.
    .where(and(eq(guestGroups.eventId, eventId), isNull(guestGroups.revokedAt)))
}
```

- [ ] **Step 4: Componer y mostrar los contadores**

En `container.ts`, agrupación `rsvp` con `respond` y `tally`, inyectando `guests.resolveByToken`, `events.getById`, `drizzleRsvpRepository`, `crypto.randomUUID` y el reloj.

`src/modules/rsvp/ui/TallyStrip.tsx`: cuatro cifras —cupos confirmados sobre invitados, grupos que respondieron, grupos pendientes— con las etiquetas en español. **Sin colores hexadecimales**: solo tokens.

`/panel/eventos/[slug]/page.tsx` monta `<TallyStrip tally={…} />` sobre la tabla.

- [ ] **Step 5: Verificar y commit**

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(rsvp): respuesta anexada con histórico y contadores del evento

El histórico es de solo anexado: responder otra vez crea una fila nueva y la
vigente es la más reciente. Los grupos revocados salen del conteo."
```

---

### Task 13: Página del invitado

**Files:**
- Create: `src/modules/rsvp/actions.ts`
- Create: `src/modules/rsvp/application/guarded-respond.ts`
- Create: `src/modules/rsvp/ui/RsvpForm.tsx`
- Rewrite: `src/app/(guest)/i/[token]/page.tsx`
- Create: `src/app/(guest)/i/[token]/layout.tsx`
- Modify: `src/shared/i18n/dictionary.ts`, `src/shared/i18n/messages/es.ts`, `src/shared/i18n/messages/en.ts`
- Test: `src/modules/rsvp/application/guarded-respond.test.ts`, `src/modules/rsvp/ui/RsvpForm.test.tsx`

**Interfaces:**
- Consumes: `respondToInvitation` (Task 12), `resolveByToken` (Task 9), `themeFor` (Task 8), `createRateLimiter` y `clientIpFrom` de `leads`.
- Produces:
  - `guardedRespond(deps)({ ip, token, payload }): Promise<RsvpOutcome>` con `RsvpOutcome = { status: 'success'; attending: number } | { status: 'error'; message: RsvpErrorKind }`
  - `respondAction(previous, formData)`
  - Claves de diccionario nuevas bajo `invitation`: `title`, `seatsLabel`, `attendingLabel`, `messageLabel`, `submit`, `sending`, `successTitle`, `successBody`, `change`, `closed`, `errors` (una por `RsvpErrorKind`).

- [ ] **Step 1: Declarar las claves de diccionario en los tres archivos**

En `src/shared/i18n/dictionary.ts`:

```ts
export interface InvitationDictionary {
  title: string
  seatsLabel: string
  attendingLabel: string
  messageLabel: string
  submit: string
  sending: string
  successTitle: string
  successBody: string
  change: string
  closed: string
  errors: Record<'invitation_not_found' | 'invitation_revoked' | 'rsvp_closed' | 'too_many_seats' | 'invalid_payload' | 'storage_failure' | 'rate_limited', string>
}
```

y añadir `invitation: InvitationDictionary` a `Dictionary`. Rellenar `es.ts` y `en.ts` **en este mismo commit**: el typecheck falla si falta alguna.

Textos en `es.ts` (los de `en.ts`, su traducción directa):

```ts
  invitation: {
    title: 'Confirma tu asistencia',
    seatsLabel: 'Cupos reservados para ti',
    attendingLabel: '¿Cuántos asisten?',
    messageLabel: 'Mensaje para los anfitriones (opcional)',
    submit: 'Confirmar',
    sending: 'Enviando…',
    successTitle: 'Confirmación recibida',
    successBody: 'Gracias. Puedes cambiar tu respuesta hasta la fecha límite.',
    change: 'Cambiar mi respuesta',
    closed: 'El plazo para confirmar ya cerró. Escríbenos por WhatsApp si necesitas avisar algo.',
    errors: {
      invitation_not_found: 'Esta invitación no existe.',
      invitation_revoked: 'Esta invitación ya no está activa.',
      rsvp_closed: 'El plazo para confirmar ya cerró.',
      too_many_seats: 'Son más personas que los cupos reservados para tu grupo.',
      invalid_payload: 'Revisa los datos e inténtalo otra vez.',
      storage_failure: 'No pudimos guardar tu respuesta. Inténtalo en un momento.',
      rate_limited: 'Demasiados intentos. Espera un minuto.',
    },
  },
```

- [ ] **Step 2: Escribir la prueba del guardián**

`src/modules/rsvp/application/guarded-respond.test.ts` — cuatro casos: la IP limitada devuelve `rate_limited` sin llamar al caso de uso; un `attending` que no es número devuelve `invalid_payload`; una respuesta válida devuelve `success`; el detalle del error nunca cruza al cliente, solo el `kind`.

- [ ] **Step 3: Ejecutar, ver fallar, escribir el guardián y la acción**

`guarded-respond.ts` sigue exactamente la forma de `guardedSubmit` de `leads`: limitador, lectura defensiva del `FormData`, llamada al caso de uso, registro del detalle en el servidor y devolución solo del `kind`.

`src/modules/rsvp/actions.ts`:

```ts
'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { rsvp } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { guardedRespond, type RsvpOutcome } from './application/guarded-respond'

export type RsvpActionState = RsvpOutcome | { status: 'idle' }

// Diez respuestas por minuto y por IP: un grupo grande cambiando de opinión cabe de
// sobra, la fuerza bruta sobre tokens no.
const respond = guardedRespond({
  limiter: createRateLimiter({ windowMs: 60_000, max: 10 }),
  respond: (input) => rsvp.respond(input),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
})

export async function respondAction(_previous: RsvpActionState, formData: FormData): Promise<RsvpActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })
  const token = String(formData.get('token') ?? '')

  const outcome = await respond({ ip, token, payload: Object.fromEntries(formData) })
  if (outcome.status === 'success') revalidatePath(`/i/${token}`)
  return outcome
}
```

- [ ] **Step 4: Escribir la prueba del formulario**

`src/modules/rsvp/ui/RsvpForm.test.tsx`:

```tsx
it('ofrece de cero al número de cupos, ambos incluidos', () => {
  render(<RsvpForm dictionary={dictionary} seats={4} token="tok" previous={null} />)
  const opciones = screen.getAllByRole('option').map((o) => o.textContent)
  expect(opciones).toEqual(['0', '1', '2', '3', '4'])
})

it('preselecciona la respuesta anterior', () => {
  render(<RsvpForm dictionary={dictionary} seats={4} token="tok" previous={{ attending: 2, message: null }} />)
  expect(screen.getByLabelText(dictionary.invitation.attendingLabel)).toHaveValue('2')
})
```

- [ ] **Step 5: Escribir el formulario y las páginas**

`RsvpForm.tsx` (cliente, `useActionState`): un `<select>` de 0 a `seats`, un `<textarea>` de 500 caracteres, campo oculto con el token, y el panel de éxito con el botón "Cambiar mi respuesta" que vuelve al formulario (mismo patrón `acknowledged` de `ConsultationForm`).

`src/app/(guest)/i/[token]/layout.tsx` — resuelve el idioma del evento para poner `lang` correcto:

```tsx
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { ReactNode } from 'react'
import { guests } from '@/app/composition/container'
import { display, sans } from '@/shared/design/fonts'
import { isErr } from '@/shared/result'
import '../../../globals.css'

// `cache` evita que layout y página resuelvan el mismo token dos veces por petición.
export const resolveInvitation = cache(async (token: string) => guests.resolveWithEvent(token))

export default async function InvitationLayout({ children, params }: { children: ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveInvitation(token)
  // Token desconocido y token revocado responden lo mismo: 404. Distinguirlos
  // confirmaría al atacante que el token existe.
  if (isErr(resolved)) notFound()

  return (
    <html lang={resolved.value.event.locale} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

Esto exige un caso de uso `resolveWithEvent(token)` en `guests` que devuelva `{ group, event, latest }`; añadirlo en esta tarea junto a su prueba, componiendo `resolveByToken` + `events.getById` + `rsvp.latestFor`.

`src/app/(guest)/i/[token]/page.tsx`:

```tsx
export const dynamic = 'force-dynamic' // el estado del RSVP cambia; no se cachea

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveInvitation(token)
  if (isErr(resolved)) notFound()

  const { group, event, latest } = resolved.value
  const dictionary = getDictionary(event.locale)
  const { Component: Theme } = themeFor(event.themeKey)
  const abierto = acceptsResponses(event, new Date().toISOString().slice(0, 10))

  return (
    <Theme event={event}>
      <p className="text-[13px] text-ink-soft">{`${group.label} · ${dictionary.invitation.seatsLabel}: ${group.seats}`}</p>
      {abierto ? (
        <RsvpForm dictionary={dictionary} previous={latest} seats={group.seats} token={token} />
      ) : (
        <p className="text-[14px] text-ink-soft">{dictionary.invitation.closed}</p>
      )}
    </Theme>
  )
}
```

Cuando la base no responde, `resolveWithEvent` devuelve `storage_failure`; en ese caso la página **no** hace `notFound()` sino que lanza para que Next responda 503 con el mensaje que remite al WhatsApp del atelier (`BRAND.whatsapp`). Crear `src/app/(guest)/i/[token]/error.tsx` con ese texto: una invitación sin datos no es una invitación, y degradar como la landing aquí no sirve.

- [ ] **Step 6: Comprobar el recorrido completo**

Crear grupo de 4 cupos en el panel, abrir su enlace en ventana privada, confirmar 3, ver el panel actualizado, volver y cambiar a 2, comprobar que el panel muestra 2 y que en la base hay **dos** filas en `rsvp_responses`. Probar `/i/inventado` → 404.

- [ ] **Step 7: Verificar y commit**

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(rsvp): página del invitado con plantilla, formulario y cierre por plazo

Token desconocido y token revocado responden 404 igual: distinguirlos
confirmaría al atacante que el token existe. El idioma sale del evento, no
del navegador del invitado."
```

---

### Task 14: Enlace de solo lectura para el cliente

**Files:**
- Create: `src/modules/events/domain/client-share.ts`
- Create: `src/modules/events/application/create-client-share.ts`, `revoke-client-share.ts`, `resolve-client-share.ts`
- Create: `src/modules/events/infrastructure/drizzle-client-share-repository.ts`
- Create: `src/app/(guest)/compartir/[token]/page.tsx`
- Modify: `src/modules/events/actions.ts`, `src/app/(panel)/panel/eventos/[slug]/page.tsx`, `container.ts`
- Test: `src/modules/events/application/resolve-client-share.test.ts`, `src/modules/events/infrastructure/drizzle-client-share-repository.test.ts`

**Interfaces:**
- Produces:
  - `createClientShare(deps)({ eventId, days })` → `{ url: string }`, con caducidad `now + days` (por defecto 60)
  - `resolveClientShare(deps)(token)` → `Result<{ event: Event; tally: RsvpTally; groups: Array<{ label: string; seats: number; attending: number | null }> }, EventError>`
  - `revokeClientShare(deps)(shareId)`
  - `createClientShareAction`, `revokeClientShareAction`

- [ ] **Step 1: Escribir la prueba de resolución**

`resolve-client-share.test.ts` — cuatro casos: token desconocido → `not_found`; enlace caducado → `not_found` (no un error propio: desde fuera son lo mismo); enlace revocado → `not_found`; enlace vivo devuelve evento, conteo y grupos.

- [ ] **Step 2: Ejecutar, ver fallar, escribir dominio, casos de uso y repositorio**

`client-share.ts` expone `isShareUsable({ expiresAt, revokedAt }, now): boolean`. El repositorio sigue el patrón de los demás, con `findByTokenHash`, `insert` y `revoke`.

`resolveClientShare` compone la búsqueda por hash, la comprobación de vigencia, `events.getById` y `rsvp.tally`.

- [ ] **Step 3: Escribir la página de solo lectura**

`src/app/(guest)/compartir/[token]/page.tsx`: `notFound()` ante cualquier error; muestra título y fecha del evento, `<TallyStrip>` y la lista de grupos con su estado. **Sin formularios y sin enlaces de invitado**: el cliente mira, no toca. `export const dynamic = 'force-dynamic'`.

- [ ] **Step 4: Añadir la creación y revocación al panel**

En `/panel/eventos/[slug]`: un botón "Crear enlace para el cliente" que muestra la URL **una sola vez** (mismo aviso que con los grupos) y, si ya hay uno vivo, su caducidad y un botón de revocar.

- [ ] **Step 5: Comprobar y commit**

Crear el enlace, abrirlo en ventana privada, ver los contadores, revocarlo y comprobar que pasa a 404.

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(events): enlace de solo lectura para el cliente, revocable y con caducidad"
```

---

### Task 15: Anonimización y limpieza programada

**Files:**
- Create: `src/modules/events/application/anonymize-expired-events.ts`
- Create: `scripts/maintenance.ts`
- Modify: `src/modules/events/application/ports.ts`, `drizzle-event-repository.ts`, `package.json`, `docker/backup.sh`, `docker/compose.yml`
- Test: `src/modules/events/application/anonymize-expired-events.test.ts`, `src/modules/events/infrastructure/anonymize.test.ts`

**Interfaces:**
- Produces:
  - `anonymizeExpiredEvents(deps)({ now }): Promise<Result<{ eventsAnonymized: number; sessionsDeleted: number }, EventError>>`
  - `pnpm maintenance` — un pase de anonimización y limpieza de sesiones caducadas.
  - `EventRepository` gana `listPendingAnonymization(now: Date): Promise<Array<{ id: string; retentionDays: number; eventDate: string }>>` y `anonymize(eventId: string, at: Date): Promise<void>`; `SessionRepository` gana `deleteExpired(now: Date): Promise<number>`.

- [ ] **Step 1: Escribir la prueba del caso de uso**

```ts
it('anonimiza solo los eventos cuya retención ya venció', async () => { /* uno vencido, uno vigente */ })
it('no vuelve a anonimizar lo ya anonimizado', async () => { /* listPendingAnonymization ya los excluye */ })
it('borra las sesiones caducadas en el mismo pase', async () => { /* … */ })
```

- [ ] **Step 2: Escribir la prueba de infraestructura**

`anonymize.test.ts`, en transacción revertida: tras `anonymize`, las etiquetas de los grupos del evento pasan a `Grupo 1`, `Grupo 2`… los mensajes de RSVP quedan en `null`, y **los agregados no cambian**: `seats` y `attending` siguen intactos y `tallyRowsFor` devuelve lo mismo que antes.

- [ ] **Step 3: Escribir la implementación**

`listPendingAnonymization` selecciona los eventos con `anonymized_at is null` y `event_date + retention_days < now`. `anonymize` corre en una transacción: renumera etiquetas con `row_number()`, pone `rsvp_responses.message` a `null` para los grupos del evento, y fija `anonymized_at`.

Los invitados no son clientes del atelier y no aceptaron ningún término: por eso se conserva el agregado y se borra lo que identifica.

- [ ] **Step 4: Escribir el comando y programarlo**

`scripts/maintenance.ts` llama al caso de uso, imprime el resumen y sale con código 0. En `package.json`: `"maintenance": "tsx --tsconfig tsconfig.json scripts/maintenance.ts"`.

El contenedor `backup` ya corre a diario y ya tiene acceso a la base, pero solo trae `psql`, no Node. Añadir en `docker/compose.yml` un servicio `maintenance` con la misma imagen de `web` (target `build`, que conserva `tsx`), en bucle diario:

```yaml
  maintenance:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      target: build
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:?POSTGRES_USER es obligatorio}:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD es obligatorio}@db:5432/${POSTGRES_DB:?POSTGRES_DB es obligatorio}
      SITE_URL: ${SITE_URL:?SITE_URL es obligatorio}
    # Un fallo no debe matar el bucle: con `restart: unless-stopped` eso sería un ciclo
    # de reinicios que nadie mira. Registra y reintenta al día siguiente.
    command: sh -c 'while true; do pnpm maintenance || echo "FALLO DE MANTENIMIENTO" >&2; sleep 86400; done'
    depends_on:
      db:
        condition: service_healthy
```

- [ ] **Step 5: Probar el pase completo a mano**

Crear un evento con `retentionDays: 1` y fecha pasada, correr `pnpm maintenance`, comprobar en la base que las etiquetas quedaron renumeradas, los mensajes en `null`, `anonymized_at` con fecha, y que los contadores del panel no cambiaron.

- [ ] **Step 6: Verificar y commit**

```bash
DATABASE_URL=… SITE_URL=… pnpm typecheck && pnpm lint && pnpm test
git add -A
git commit -m "feat(events): anonimización por retención y limpieza de sesiones

Los invitados no son clientes del atelier y no aceptaron ningún término: se
conserva el agregado y se borra lo que identifica."
```

---

### Task 16: Pruebas de extremo a extremo y de seguridad

**Files:**
- Create: `tests/e2e/invitation.spec.ts`
- Create: `tests/e2e/fixtures/seed-event.ts`
- Create: `src/modules/guests/infrastructure/token-not-stored.test.ts`
- Modify: `docs/superpowers/2026-08-19-handoff.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Escribir la prueba de seguridad del token**

`src/modules/guests/infrastructure/token-not-stored.test.ts` — la afirmación que exige la sección 9 del spec:

```ts
it('el token en claro no aparece en ninguna columna de la base', async () => {
  await inRolledBackTransaction(async (tx) => {
    const evento = await sembrarEvento(tx)
    const { token } = await addGuestGroup({ groups: createDrizzleGuestGroupRepository(tx), minter: createTokenMinter(), ids: () => crypto.randomUUID() })({
      eventId: evento.id,
      label: 'Familia Rojas',
      seats: 4,
    }).then((r) => (isOk(r) ? r.value : (() => { throw new Error('el alta falló') })()))

    const filas = await tx.select().from(guestGroups)
    const volcado = JSON.stringify(filas)

    expect(volcado).not.toContain(token)
    expect(volcado.length).toBeGreaterThan(0) // el volcado no está vacío por accidente
  })
})
```

- [ ] **Step 2: Escribir la sembradora de eventos para e2e**

`tests/e2e/fixtures/seed-event.ts` crea, por conexión directa a Postgres, un evento `live` con fecha límite futura y un grupo de 4 cupos, y devuelve `{ eventSlug, token }`. Se limpia al final con `delete from events where slug = …` (la cascada arrastra grupos y respuestas).

- [ ] **Step 3: Escribir las pruebas e2e**

`tests/e2e/invitation.spec.ts` — exactamente el recorrido de la sección 9 del spec:

```ts
test('el invitado confirma 3 de 4 cupos y luego cambia a 2', async ({ page }) => {
  const { token, eventSlug } = await seedEvent()

  await page.goto(`/i/${token}`)
  await page.getByLabel('¿Cuántos asisten?').selectOption('3')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Confirmación recibida')).toBeVisible()

  await page.getByRole('button', { name: 'Cambiar mi respuesta' }).click()
  await page.getByLabel('¿Cuántos asisten?').selectOption('2')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Confirmación recibida')).toBeVisible()

  await signInAsAtelier(page)
  await page.goto(`/panel/eventos/${eventSlug}`)
  await expect(page.getByText('2 / 4')).toBeVisible()
})

test('un token inválido da 404', async ({ page }) => {
  expect((await page.goto('/i/tokenquenoexiste123'))?.status()).toBe(404)
})

test('una invitación revocada no acepta respuesta', async ({ page }) => {
  const { token } = await seedEvent({ revoked: true })
  expect((await page.goto(`/i/${token}`))?.status()).toBe(404)
})

test('el panel exige sesión', async ({ page }) => {
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/panel\/entrar$/)
})
```

`signInAsAtelier` es un ayudante que crea el usuario si no existe (llamando al mismo caso de uso) y rellena `/panel/entrar`.

- [ ] **Step 4: Ejecutar toda la verificación**

```bash
export DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e
```

Expected: todo verde. Si e2e falla en cadena, comprobar primero que no hay un servidor viejo en el puerto 3000 (`lsof -i :3000 -sTCP:LISTEN`): `reuseExistingServer` lo reutilizaría y probaría código que ya no existe.

- [ ] **Step 5: Probar la pila Docker completa**

```bash
docker compose -f docker/compose.yml --profile tools run --rm migrator
docker compose -f docker/compose.yml up -d --build
docker compose -f docker/compose.yml exec web node -e "require('@node-rs/argon2')" && echo "argon2 sobrevivió al empaquetado"
```

Sin ese último paso, el fallo de empaquetado del binario nativo aparecería en producción, no aquí.

- [ ] **Step 6: Actualizar la documentación**

En `CLAUDE.md`: estado del ciclo 3 rebanada 1 cerrada, comandos nuevos (`pnpm user:create`, `pnpm maintenance`), y la nota de que el panel vive en `(panel)` con su propia raíz de layout.

Escribir el handoff del día en `docs/superpowers/YYYY-MM-DD-handoff.md` siguiendo el formato del anterior: qué se hizo, estado verificable, lo aprendido, pendientes del usuario y qué sigue (rebanada 2: canales de envío).

- [ ] **Step 7: Commit final**

```bash
git add -A
git commit -m "test: recorrido e2e del RSVP y prueba de que el token no se guarda

Cubre la sección 9 del spec: confirmar 3 de 4, cambiar a 2, ver ambos
cambios en el panel, 404 con token inválido y con invitación revocada."
```

---

## Revisión del plan contra el spec

| Sección del spec | Dónde queda cubierta |
|---|---|
| 2 · Autenticación del atelier | Tasks 3, 4, 5, 6 |
| 2 · Evento: alta, edición, plazo, idioma, estado | Tasks 7, 8 |
| 2 · Grupos con cupos y token por grupo | Tasks 9, 10 |
| 2 · Página pública `/i/{token}` con RSVP | Task 13 |
| 2 · Respuesta con histórico | Tasks 11, 12 |
| 2 · Panel: bandeja, lista, contadores en vivo | Tasks 8, 10, 12 |
| 2 · Enlace de solo lectura revocable y con caducidad | Task 14 |
| 2 · Anonimización por retención | Task 15 |
| 3 · Módulos y fronteras · deuda del layout raíz | Task 1 (deuda), 3–14 (módulos) |
| 4 · Modelo de dominio e invariantes | Tasks 7, 9, 11 |
| 5 · Esquema e índices | Task 2 |
| 6 · Rutas, idioma del evento, Server Actions | Tasks 1, 6, 8, 10, 13, 14 |
| 7 · Seguridad: token de 128 bits, solo hash, 404, límites, revocación | Tasks 5, 6, 9, 13, 16 |
| 8 · `Result`, siete `RsvpError`, 404 y 503 | Tasks 11, 12, 13 |
| 9 · Pruebas de dominio, aplicación, infraestructura, e2e y seguridad | Todas; el cierre en la Task 16 |
| 10 · Despliegue: migraciones, comando de alta, tarea programada | Tasks 2, 5, 15 |

Sin huecos. Los cuatro puntos que el spec dejaba sin definir están resueltos en "Desviaciones del spec" al principio de este plan.
