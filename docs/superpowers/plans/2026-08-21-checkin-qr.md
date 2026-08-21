# Check-in por QR con puerta sin conexión — Plan de implementación

> **Para agentes ejecutores:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendada) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que el invitado muestre en la puerta el mismo enlace que recibió por WhatsApp, que quien recibe lo escanee sin tocar la pantalla, y que todo siga funcionando con el salón sin wifi.

**Arquitectura:** módulo nuevo `src/modules/checkin/` con la disposición de siempre (dominio puro, aplicación con puertos, infraestructura Drizzle, UI). Una tabla `arrivals` append-only con clave de idempotencia por escaneo. El dispositivo precarga hashes de token y resuelve verde/ámbar/rojo en local con el mismo dominio que usa el servidor; los escaneos se acumulan en IndexedDB y suben en lote por Server Actions.

**Stack:** Next.js 16 (App Router), React 19, Drizzle ORM, Postgres 17, Vitest, Testing Library, Playwright, Serwist, Tailwind con tokens propios.

**Spec:** `docs/superpowers/specs/2026-08-21-checkin-qr-design.md`

## Restricciones globales

Aplican a **todas** las tareas. No se repiten en cada una.

- **pnpm exclusivamente.** Nunca npm ni yarn.
- TypeScript strict con `noUncheckedIndexedAccess`. Prohibido `any` y `@ts-ignore`.
- Cualquier comando que toque la base o compile necesita el prefijo:
  `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`
- Postgres en el **puerto 5434**. Si no responde: `docker compose -f docker/compose.dev.yml up -d`. Docker Desktop puede estar parado: `open -a Docker`.
- **Fronteras:** `domain` no importa nada; `application` importa `domain` y `@/shared`, nunca `infrastructure`; solo `src/app` conecta puertos con adaptadores, en `src/app/composition/container.ts`. Cada módulo se importa por su `index.ts`.
- **Ningún color hexadecimal fuera de `src/shared/design/tokens.css`.**
- **Toda Server Action del panel abre con `await requireSession()`.**
- **Ningún token en claro toca la base ni el manifiesto.** Solo SHA-256.
- Un token desconocido responde `unknown`, nunca un error que confirme que existe. 404, nunca 403.
- Toda animación respeta `prefers-reduced-motion: reduce`.
- El panel es **solo español**, con literales en el código: no hay diccionario para el panel.
- Errores esperados con `Result`, nunca excepciones. `attempt()` envuelve lo que puede lanzar.
- Al cerrar cada tarea: `pnpm typecheck && pnpm lint && pnpm test` en verde antes del commit.
- La maqueta de referencia para la UI está en `public/dashboard/Dashboard.html` y `public/dashboard/dashboard.js`, sección "Modo puerta". Se portan las decisiones de interacción, no el código.

---

## Estructura de archivos

**Crear:**

| Archivo | Responsabilidad |
|---|---|
| `src/modules/checkin/domain/errors.ts` | Tipo de error del módulo |
| `src/modules/checkin/domain/parse-pass.ts` | Extraer y validar el token de lo escaneado |
| `src/modules/checkin/domain/arrival.ts` | Reglas de una llegada |
| `src/modules/checkin/domain/door-tally.ts` | Conteo de grupos y personas |
| `src/modules/checkin/domain/conflict.ts` | Una sola verdad por grupo a partir de N escaneos |
| `src/modules/checkin/application/ports.ts` | Interfaz del repositorio |
| `src/modules/checkin/application/check-in-by-scan.ts` | Registrar un lote de escaneos |
| `src/modules/checkin/application/adjust-arrival.ts` | Corregir cuántos entraron |
| `src/modules/checkin/application/void-arrival.ts` | Deshacer con lápida |
| `src/modules/checkin/application/get-door-manifest.ts` | Lo que el dispositivo precarga |
| `src/modules/checkin/application/get-door-state.ts` | Estado en vivo de la puerta |
| `src/modules/checkin/infrastructure/drizzle-arrival-repository.ts` | Adaptador Postgres |
| `src/modules/checkin/actions.ts` | Server Actions |
| `src/modules/checkin/index.ts` | Barril del módulo |
| `src/modules/checkin/ui/ScanResultCard.tsx` | Tarjeta verde/ámbar/roja |
| `src/modules/checkin/ui/DoorSearchSheet.tsx` | Buscador por nombre |
| `src/modules/checkin/ui/DoorMode.tsx` | Cámara, bucle de escaneo, orquestación |
| `src/modules/checkin/ui/outbox.ts` | Bandeja de salida en IndexedDB |
| `src/modules/checkin/ui/local-resolve.ts` | Hash con Web Crypto y resolución contra el manifiesto |
| `src/app/(panel)/panel/eventos/[slug]/puerta/page.tsx` | Ruta del modo puerta |
| `db/migrations/0003_checkin.sql` | Migración |
| `public/manifest.webmanifest` | PWA |
| `src/app/sw.ts` | Service Worker (Serwist) |
| `tests/e2e/checkin.spec.ts` | e2e |

**Modificar:**

| Archivo | Cambio |
|---|---|
| `src/shared/db/schema.ts` | Tabla `arrivals` y su relación |
| `src/shared/design/tokens.css` | `--color-ok`, `--color-warn`, `--color-danger` y sus variantes |
| `src/app/composition/container.ts` | Objeto `checkin` |
| `src/app/(panel)/panel/eventos/[slug]/page.tsx` | Enlace a la puerta |
| `src/app/(guest)/i/[token]/page.tsx` | QR del pase |
| `next.config.ts` | Envoltura de Serwist |
| `package.json` | Dependencias `serwist`, `@serwist/next`, `qrcode` |

---

# FASE A — Check-in en línea

## Task 1: Tabla `arrivals`

**Archivos:**
- Modificar: `src/shared/db/schema.ts`
- Crear: `db/migrations/0003_checkin.sql` (generada)
- Test: `src/shared/db/schema.test.ts` (añadir casos)

**Interfaces:**
- Consume: `guestGroups` de `@/shared/db/schema`
- Produce: `arrivals` — columnas `id`, `scanId`, `guestGroupId`, `arrivedCount`, `scannedAt`, `receivedAt`, `voidedAt`

- [ ] **Paso 1: escribir la prueba que falla**

Añade a `src/shared/db/schema.test.ts`:

```ts
import { arrivals } from './schema'

describe('arrivals', () => {
  it('guarda la clave de idempotencia del escaneo', () => {
    expect(arrivals.scanId.notNull).toBe(true)
    expect(arrivals.scanId.isUnique).toBe(true)
  })

  it('deshacer es una lápida, no un borrado', () => {
    expect(arrivals.voidedAt.notNull).toBe(false)
  })

  it('separa la hora del dispositivo de la del servidor', () => {
    expect(arrivals.scannedAt.notNull).toBe(true)
    expect(arrivals.receivedAt.notNull).toBe(true)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/shared/db/schema.test.ts`
Esperado: FALLA con `arrivals` no exportado.

- [ ] **Paso 3: añadir la tabla**

En `src/shared/db/schema.ts`, después de `rsvpResponses`:

```ts
/**
 * Registro append-only de escaneos, no una fila por grupo. `scan_id` es la clave de
 * idempotencia que genera el dispositivo: reenviar el mismo lote veinte veces desde la
 * bandeja de salida inserta una vez. Dos puertas sin red producen dos filas en vez de
 * una carrera de escrituras perdidas, y deshacer deja lápida en vez de borrar.
 */
export const arrivals = pgTable(
  'arrivals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scanId: uuid('scan_id').notNull().unique(),
    guestGroupId: uuid('guest_group_id')
      .notNull()
      .references(() => guestGroups.id, { onDelete: 'cascade' }),
    arrivedCount: integer('arrived_count').notNull(),
    // Reloj del dispositivo. Puede estar mal; por eso existe `received_at`.
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
  },
  (t) => [index('arrivals_group_idx').on(t.guestGroupId, t.scannedAt.desc())],
)
```

Y amplía la relación existente:

```ts
export const guestGroupsRelations = relations(guestGroups, ({ many, one }) => ({
  responses: many(rsvpResponses),
  arrivals: many(arrivals),
  event: one(events, { fields: [guestGroups.eventId], references: [events.id] }),
}))
```

- [ ] **Paso 4: generar la migración y aplicarla**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm db:generate
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm db:migrate
```

Renombra el archivo generado a `db/migrations/0003_checkin.sql` si drizzle-kit le puso otro nombre, y añade a mano el `CHECK` que drizzle-kit no genera:

```sql
ALTER TABLE arrivals ADD CONSTRAINT arrivals_count_positive CHECK (arrived_count >= 1);
CREATE INDEX arrivals_live_idx ON arrivals (guest_group_id) WHERE voided_at IS NULL;
```

- [ ] **Paso 5: verificar en la base**

```bash
PGPASSWORD=invite psql -h localhost -p 5434 -U invite -d invite -c "\d arrivals"
```
Esperado: la tabla con `scan_id` único, el `CHECK` y los dos índices.

- [ ] **Paso 6: pruebas y commit**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm test && pnpm typecheck && pnpm lint
git add src/shared/db/schema.ts db/migrations/
git commit -m "feat: tabla de llegadas append-only con clave de idempotencia"
```

---

## Task 2: Errores del módulo y `parsePass`

**Archivos:**
- Crear: `src/modules/checkin/domain/errors.ts`
- Crear: `src/modules/checkin/domain/parse-pass.ts`
- Test: `src/modules/checkin/domain/parse-pass.test.ts`

**Interfaces:**
- Consume: `Result`, `ok`, `err` de `@/shared/result`
- Produce:
  - `type CheckinErrorKind = 'malformed_pass' | 'invalid_count' | 'unknown_pass' | 'wrong_event' | 'revoked' | 'not_found' | 'storage_failure'`
  - `checkinError(kind, detail): CheckinError`
  - `parsePass(scanned: string): Result<string, CheckinError>` — devuelve el token pelado

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/domain/parse-pass.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { parsePass } from './parse-pass'

// 16 bytes en base64url son 22 caracteres.
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'

describe('parsePass', () => {
  it('acepta la URL de invitación completa', () => {
    const r = parsePass(`https://invitepremium.bo/i/${TOKEN}`)
    expect(isOk(r) && r.value).toBe(TOKEN)
  })

  it('acepta el token pelado, que es lo que teclea un lector USB', () => {
    const r = parsePass(TOKEN)
    expect(isOk(r) && r.value).toBe(TOKEN)
  })

  it('tolera espacios alrededor', () => {
    expect(isOk(parsePass(`  ${TOKEN}  `))).toBe(true)
  })

  it('acepta la URL con barra final o parámetros', () => {
    expect(isOk(parsePass(`https://x.bo/i/${TOKEN}/`))).toBe(true)
    expect(isOk(parsePass(`https://x.bo/i/${TOKEN}?utm=wa`))).toBe(true)
  })

  it('rechaza un QR cualquiera de la calle sin tocar la base', () => {
    expect(isErr(parsePass('https://www.coca-cola.com/promo'))).toBe(true)
    expect(isErr(parsePass('BEGIN:VCARD'))).toBe(true)
    expect(isErr(parsePass(''))).toBe(true)
  })

  it('rechaza una longitud que no es la del token', () => {
    expect(isErr(parsePass('AbCdEf'))).toBe(true)
    expect(isErr(parsePass(`${TOKEN}XX`))).toBe(true)
  })

  it('rechaza caracteres fuera de base64url', () => {
    expect(isErr(parsePass('AbCdEfGhIjKlMnOpQrStU+'))).toBe(true)
  })

  it('rechaza una URL de este sitio que no sea de invitación', () => {
    expect(isErr(parsePass(`https://x.bo/compartir/${TOKEN}`))).toBe(true)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/domain/parse-pass.test.ts`
Esperado: FALLA, no existe el módulo.

- [ ] **Paso 3: implementar**

`src/modules/checkin/domain/errors.ts`:

```ts
export type CheckinErrorKind =
  | 'malformed_pass'
  | 'invalid_count'
  | 'unknown_pass'
  | 'wrong_event'
  | 'revoked'
  | 'not_found'
  | 'storage_failure'

export type CheckinError = { readonly kind: CheckinErrorKind; readonly detail: string }

export const checkinError = (kind: CheckinErrorKind, detail: string): CheckinError => ({ kind, detail })
```

`src/modules/checkin/domain/parse-pass.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from './errors'

/** 16 bytes en base64url: veintidós caracteres de `[A-Za-z0-9_-]`. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{22}$/
const INVITATION_PATH = /\/i\/([A-Za-z0-9_-]{22})\/?$/

/**
 * Lo escaneado puede ser la URL completa del QR o el token pelado que teclea un lector
 * por USB. La forma se valida aquí, antes de tocar la base: un QR de un cartel de la
 * calle no debe llegar a consultar Postgres.
 */
export function parsePass(scanned: string): Result<string, CheckinError> {
  const raw = scanned.trim()
  if (raw.length === 0) return err(checkinError('malformed_pass', 'Escaneo vacío'))

  if (TOKEN_SHAPE.test(raw)) return ok(raw)

  if (raw.includes('://')) {
    let path: string
    try {
      path = new URL(raw).pathname
    } catch {
      return err(checkinError('malformed_pass', 'No es una dirección válida'))
    }
    const found = INVITATION_PATH.exec(path)
    if (found?.[1]) return ok(found[1])
  }

  return err(checkinError('malformed_pass', 'El código no tiene forma de pase'))
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/domain/parse-pass.test.ts`
Esperado: PASA, 8 casos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/domain/
git commit -m "feat: lectura del pase escaneado, con la forma validada antes de la base"
```

---

## Task 3: Reglas de una llegada

**Archivos:**
- Crear: `src/modules/checkin/domain/arrival.ts`
- Test: `src/modules/checkin/domain/arrival.test.ts`

**Interfaces:**
- Produce:
  - `type Arrival = { scanId, guestGroupId, arrivedCount, scannedAt, voidedAt }`
  - `createArrival(input: ArrivalInput, seats: number): Result<Arrival, CheckinError>`
  - `isLive(a: Arrival): boolean`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/domain/arrival.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createArrival, isLive } from './arrival'

const base = {
  scanId: '11111111-1111-4111-8111-111111111111',
  guestGroupId: 'g1',
  arrivedCount: 2,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
  voidedAt: null,
}

describe('createArrival', () => {
  it('acepta una llegada dentro de los cupos', () => {
    expect(isOk(createArrival(base, 4))).toBe(true)
  })

  it('acepta que llegue el grupo entero', () => {
    expect(isOk(createArrival({ ...base, arrivedCount: 4 }, 4))).toBe(true)
  })

  it('rechaza cero: un grupo que no entró no se registra', () => {
    const r = createArrival({ ...base, arrivedCount: 0 }, 4)
    expect(isErr(r) && r.error.kind).toBe('invalid_count')
  })

  it('rechaza más personas que cupos', () => {
    expect(isErr(createArrival({ ...base, arrivedCount: 5 }, 4))).toBe(true)
  })

  it('rechaza cantidades fraccionarias o negativas', () => {
    expect(isErr(createArrival({ ...base, arrivedCount: 1.5 }, 4))).toBe(true)
    expect(isErr(createArrival({ ...base, arrivedCount: -1 }, 4))).toBe(true)
  })

  it('una llegada con lápida ya no está viva', () => {
    const r = createArrival({ ...base, voidedAt: new Date() }, 4)
    expect(isOk(r) && isLive(r.value)).toBe(false)
  })

  it('una llegada sin lápida está viva', () => {
    const r = createArrival(base, 4)
    expect(isOk(r) && isLive(r.value)).toBe(true)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/domain/arrival.test.ts`
Esperado: FALLA, no existe `./arrival`.

- [ ] **Paso 3: implementar**

`src/modules/checkin/domain/arrival.ts`:

```ts
import { err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from './errors'

export type Arrival = {
  readonly scanId: string
  readonly guestGroupId: string
  readonly arrivedCount: number
  readonly scannedAt: Date
  readonly voidedAt: Date | null
}

export type ArrivalInput = {
  scanId: string
  guestGroupId: string
  arrivedCount: number
  scannedAt: Date
  voidedAt: Date | null
}

/**
 * El límite superior son los cupos del grupo, que viven en otra tabla y no caben en una
 * restricción de columna: se impone aquí, antes de llegar a la base.
 */
export function createArrival(input: ArrivalInput, seats: number): Result<Arrival, CheckinError> {
  const { arrivedCount } = input
  if (!Number.isInteger(arrivedCount) || arrivedCount < 1) {
    return err(checkinError('invalid_count', `Cantidad inválida: ${arrivedCount}. Un grupo que no entró no se registra.`))
  }
  if (arrivedCount > seats) {
    return err(checkinError('invalid_count', `Llegaron ${arrivedCount} y el grupo tiene ${seats} cupos.`))
  }

  return ok({
    scanId: input.scanId,
    guestGroupId: input.guestGroupId,
    arrivedCount,
    scannedAt: input.scannedAt,
    voidedAt: input.voidedAt,
  })
}

export const isLive = (arrival: Arrival): boolean => arrival.voidedAt === null
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/domain/arrival.test.ts`
Esperado: PASA, 7 casos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/domain/arrival.ts src/modules/checkin/domain/arrival.test.ts
git commit -m "feat: reglas de una llegada, con los cupos como techo"
```

---

## Task 4: Resolución de conflicto

**Archivos:**
- Crear: `src/modules/checkin/domain/conflict.ts`
- Test: `src/modules/checkin/domain/conflict.test.ts`

**Interfaces:**
- Consume: `Arrival`, `isLive` de `./arrival`
- Produce:
  - `type ResolvedArrival = { guestGroupId, arrivedAt, arrivedCount, scanCount }`
  - `resolveArrival(arrivals: readonly Arrival[]): ResolvedArrival | null`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/domain/conflict.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveArrival } from './conflict'
import type { Arrival } from './arrival'

const scan = (scanId: string, arrivedCount: number, iso: string, voidedAt: Date | null = null): Arrival => ({
  scanId,
  guestGroupId: 'g1',
  arrivedCount,
  scannedAt: new Date(iso),
  voidedAt,
})

describe('resolveArrival', () => {
  it('sin escaneos no hay llegada', () => {
    expect(resolveArrival([])).toBeNull()
  })

  it('con un solo escaneo devuelve ese', () => {
    const r = resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z')])
    expect(r?.arrivedCount).toBe(3)
    expect(r?.arrivedAt.toISOString()).toBe('2026-10-18T21:00:00.000Z')
  })

  it('dos puertas: gana la hora más temprana, porque es cuando cruzaron', () => {
    const r = resolveArrival([
      scan('b', 2, '2026-10-18T21:10:00Z'),
      scan('a', 3, '2026-10-18T21:00:00Z'),
    ])
    expect(r?.arrivedAt.toISOString()).toBe('2026-10-18T21:00:00.000Z')
  })

  it('la cantidad la manda el escaneo más reciente: es la última corrección humana', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 2, '2026-10-18T21:10:00Z'),
    ])
    expect(r?.arrivedCount).toBe(2)
  })

  it('ignora los escaneos con lápida', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 9, '2026-10-18T21:10:00Z', new Date()),
    ])
    expect(r?.arrivedCount).toBe(3)
    expect(r?.scanCount).toBe(1)
  })

  it('si todos tienen lápida, el grupo no ha llegado', () => {
    expect(resolveArrival([scan('a', 3, '2026-10-18T21:00:00Z', new Date())])).toBeNull()
  })

  it('cuenta los escaneos vivos, para poder avisar de un conflicto', () => {
    const r = resolveArrival([
      scan('a', 3, '2026-10-18T21:00:00Z'),
      scan('b', 2, '2026-10-18T21:10:00Z'),
    ])
    expect(r?.scanCount).toBe(2)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/domain/conflict.test.ts`
Esperado: FALLA, no existe `./conflict`.

- [ ] **Paso 3: implementar**

`src/modules/checkin/domain/conflict.ts`:

```ts
import { isLive, type Arrival } from './arrival'

export type ResolvedArrival = {
  readonly guestGroupId: string
  readonly arrivedAt: Date
  readonly arrivedCount: number
  /** Escaneos vivos del grupo. Más de uno significa dos puertas o un reenvío doble. */
  readonly scanCount: number
}

/**
 * Un grupo puede tener varias filas: dos puertas sin red, o un reintento que llegó por
 * caminos distintos. La regla que hace que sincronizar tarde no reescriba la historia:
 * la hora la fija el escaneo más temprano —es cuando cruzaron la puerta— y la cantidad
 * la fija el más reciente, que es la última corrección que hizo un humano.
 */
export function resolveArrival(arrivals: readonly Arrival[]): ResolvedArrival | null {
  const live = arrivals.filter(isLive)
  const first = live[0]
  if (!first) return null

  let earliest = first
  let latest = first
  for (const arrival of live) {
    if (arrival.scannedAt < earliest.scannedAt) earliest = arrival
    if (arrival.scannedAt > latest.scannedAt) latest = arrival
  }

  return {
    guestGroupId: first.guestGroupId,
    arrivedAt: earliest.scannedAt,
    arrivedCount: latest.arrivedCount,
    scanCount: live.length,
  }
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/domain/conflict.test.ts`
Esperado: PASA, 7 casos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/domain/conflict.ts src/modules/checkin/domain/conflict.test.ts
git commit -m "feat: una sola verdad por grupo a partir de varios escaneos"
```

---

## Task 5: Conteo de la puerta

**Archivos:**
- Crear: `src/modules/checkin/domain/door-tally.ts`
- Test: `src/modules/checkin/domain/door-tally.test.ts`

**Interfaces:**
- Consume: `ResolvedArrival` de `./conflict`
- Produce:
  - `type DoorGroup = { id, label, seats, attending, revoked }`
  - `type DoorTally = { expectedGroups, arrivedGroups, expectedHeads, headsInside, unexpectedGroups }`
  - `doorTally(groups: readonly DoorGroup[], resolved: readonly ResolvedArrival[]): DoorTally`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/domain/door-tally.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { doorTally, type DoorGroup } from './door-tally'
import type { ResolvedArrival } from './conflict'

const group = (id: string, seats: number, attending: number | null, revoked = false): DoorGroup => ({
  id,
  label: `Grupo ${id}`,
  seats,
  attending,
  revoked,
})

const arrived = (guestGroupId: string, arrivedCount: number): ResolvedArrival => ({
  guestGroupId,
  arrivedAt: new Date('2026-10-18T21:00:00Z'),
  arrivedCount,
  scanCount: 1,
})

describe('doorTally', () => {
  it('sin llegadas, todo son esperados', () => {
    const t = doorTally([group('a', 4, 4), group('b', 2, 2)], [])
    expect(t.expectedGroups).toBe(2)
    expect(t.arrivedGroups).toBe(0)
    expect(t.expectedHeads).toBe(6)
    expect(t.headsInside).toBe(0)
  })

  it('cuenta las personas que hay dentro, no los cupos', () => {
    const t = doorTally([group('a', 4, 4)], [arrived('a', 2)])
    expect(t.headsInside).toBe(2)
    expect(t.arrivedGroups).toBe(1)
  })

  it('quien no confirmó suma a esperados con cero cabezas', () => {
    const t = doorTally([group('a', 4, null)], [])
    expect(t.expectedGroups).toBe(1)
    expect(t.expectedHeads).toBe(0)
  })

  it('quien dijo que no vendría y aparece igual cuenta como llegado', () => {
    // Un grupo revocado no es esperado, pero si entra, entró.
    const t = doorTally([group('a', 4, 4), group('x', 2, 0, true)], [arrived('x', 2)])
    expect(t.expectedGroups).toBe(1)
    expect(t.arrivedGroups).toBe(1)
    expect(t.headsInside).toBe(2)
    expect(t.unexpectedGroups).toBe(1)
  })

  it('una llegada de un grupo que ya no está en la lista no rompe el conteo', () => {
    const t = doorTally([group('a', 4, 4)], [arrived('fantasma', 3)])
    expect(t.arrivedGroups).toBe(1)
    expect(t.headsInside).toBe(3)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/domain/door-tally.test.ts`
Esperado: FALLA, no existe `./door-tally`.

- [ ] **Paso 3: implementar**

`src/modules/checkin/domain/door-tally.ts`:

```ts
import type { ResolvedArrival } from './conflict'

export type DoorGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  /** Cupos confirmados en la última respuesta de RSVP; `null` si no respondió. */
  readonly attending: number | null
  readonly revoked: boolean
}

export type DoorTally = {
  readonly expectedGroups: number
  readonly arrivedGroups: number
  readonly expectedHeads: number
  readonly headsInside: number
  /** Grupos que entraron sin estar entre los esperados. */
  readonly unexpectedGroups: number
}

/**
 * Esperados y llegados NO son el mismo conjunto. En una boda aparece gente que había
 * dicho que no, y su pase es válido: se registra igual. Contar los llegados filtrando
 * por confirmación deja a esa persona dentro del salón y fuera del contador, que es
 * exactamente la contradicción que se detectó en la maqueta.
 */
export function doorTally(groups: readonly DoorGroup[], resolved: readonly ResolvedArrival[]): DoorTally {
  const expected = groups.filter((g) => !g.revoked)
  const expectedIds = new Set(expected.map((g) => g.id))

  return {
    expectedGroups: expected.length,
    expectedHeads: expected.reduce((sum, g) => sum + (g.attending ?? 0), 0),
    arrivedGroups: resolved.length,
    headsInside: resolved.reduce((sum, a) => sum + a.arrivedCount, 0),
    unexpectedGroups: resolved.filter((a) => !expectedIds.has(a.guestGroupId)).length,
  }
}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/domain/door-tally.test.ts`
Esperado: PASA, 5 casos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/domain/door-tally.ts src/modules/checkin/domain/door-tally.test.ts
git commit -m "feat: conteo de puerta que separa esperados de llegados"
```

---

## Task 6: Puertos y registro de un lote de escaneos

**Archivos:**
- Crear: `src/modules/checkin/application/ports.ts`
- Crear: `src/modules/checkin/application/check-in-by-scan.ts`
- Test: `src/modules/checkin/application/check-in-by-scan.test.ts`

**Interfaces:**
- Consume: `parsePass`, `createArrival`, `resolveArrival`, `checkinError`; `Minter` de `@/shared/security/tokens`
- Produce:
  - `interface ArrivalRepository { insertIfAbsent, listByEvent, findByScanId, adjust, void }`
  - `interface DoorGroupReader { findByTokenHash(hash): Promise<DoorGroupRow | null>; listByEvent(eventId): Promise<DoorGroupRow[]> }`
  - `type ScanOutcome = { scanId, kind: 'welcome' | 'already' | 'unknown', group?, arrivedAt?, arrivedCount? }`
  - `checkInByScan(deps)(input: { eventId, scans: ScanRequest[] }): Promise<Result<ScanOutcome[], CheckinError>>`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/application/check-in-by-scan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isOk } from '@/shared/result'
import { checkInByScan } from './check-in-by-scan'
import type { ArrivalRepository, DoorGroupReader } from './ports'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
const OTRO = 'ZzYyXxWwVvUuTtSsRrQqPp'

const minter = { mint: () => ({ token: '', hash: Buffer.alloc(0) }), hashOf: (t: string) => Buffer.from(`h:${t}`) }

const groupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 4,
  revoked: false,
  tokenHash: Buffer.from(`h:${TOKEN}`),
}

const fakes = () => {
  const rows: Parameters<ArrivalRepository['insertIfAbsent']>[0][] = []
  const groups: DoorGroupReader = {
    async findByTokenHash(hash) {
      if (hash.equals(Buffer.from(`h:${TOKEN}`))) return groupRow
      if (hash.equals(Buffer.from(`h:${OTRO}`))) return { ...groupRow, id: 'g9', eventId: 'OTRO-EVENTO' }
      return null
    },
    async listByEvent() {
      return [groupRow]
    },
  }
  const arrivals: ArrivalRepository = {
    async insertIfAbsent(row) {
      if (rows.some((r) => r.scanId === row.scanId)) return false
      rows.push(row)
      return true
    },
    async listByEvent() {
      return rows
    },
    async findByScanId(scanId) {
      return rows.find((r) => r.scanId === scanId) ?? null
    },
    async adjust() {},
    async void() {},
  }
  return { groups, arrivals, rows }
}

const scan = (scanId: string, scanned = TOKEN, arrivedCount = 4) => ({
  scanId,
  scanned,
  arrivedCount,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
})

describe('checkInByScan', () => {
  it('registra un pase válido y devuelve bienvenida', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1')] })
    expect(isOk(r) && r.value[0]?.kind).toBe('welcome')
    expect(rows).toHaveLength(1)
  })

  it('el mismo escaneo reenviado no inserta dos veces', async () => {
    const { groups, arrivals, rows } = fakes()
    const run = checkInByScan({ groups, arrivals, minter })
    await run({ eventId: 'e1', scans: [scan('s1')] })
    const r = await run({ eventId: 'e1', scans: [scan('s1')] })
    expect(rows).toHaveLength(1)
    expect(isOk(r) && r.value[0]?.kind).toBe('already')
  })

  it('un segundo escaneo distinto del mismo grupo sale como repetido', async () => {
    const { groups, arrivals } = fakes()
    const run = checkInByScan({ groups, arrivals, minter })
    await run({ eventId: 'e1', scans: [scan('s1')] })
    const r = await run({ eventId: 'e1', scans: [scan('s2')] })
    expect(isOk(r) && r.value[0]?.kind).toBe('already')
  })

  it('el pase de otra boda de la misma plataforma no abre esta puerta', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1', OTRO)] })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
    expect(rows).toHaveLength(0)
  })

  it('un token desconocido es unknown, nunca un error que confirme que existe', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1', 'QqQqQqQqQqQqQqQqQqQqQq')] })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
  })

  it('un QR de la calle es unknown sin llegar a consultar la base', async () => {
    const { groups, arrivals } = fakes()
    let consultas = 0
    const espia: DoorGroupReader = { ...groups, findByTokenHash: async (h) => (consultas++, groups.findByTokenHash(h)) }
    const r = await checkInByScan({ groups: espia, arrivals, minter })({ eventId: 'e1', scans: [scan('s1', 'https://coca-cola.com')] })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
    expect(consultas).toBe(0)
  })

  it('rechaza una cantidad mayor que los cupos sin insertar', async () => {
    const { groups, arrivals, rows } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({ eventId: 'e1', scans: [scan('s1', TOKEN, 9)] })
    expect(isOk(r) && r.value[0]?.kind).toBe('unknown')
    expect(rows).toHaveLength(0)
  })

  it('un lote mixto procesa cada escaneo por separado', async () => {
    const { groups, arrivals } = fakes()
    const r = await checkInByScan({ groups, arrivals, minter })({
      eventId: 'e1',
      scans: [scan('s1'), scan('s2', 'basura'), scan('s3', OTRO)],
    })
    expect(isOk(r) && r.value.map((o) => o.kind)).toEqual(['welcome', 'unknown', 'unknown'])
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/application/check-in-by-scan.test.ts`
Esperado: FALLA, no existen los módulos.

- [ ] **Paso 3: implementar los puertos**

`src/modules/checkin/application/ports.ts`:

```ts
export type DoorGroupRow = {
  readonly id: string
  readonly eventId: string
  readonly label: string
  readonly seats: number
  readonly attending: number | null
  readonly revoked: boolean
  readonly tokenHash: Buffer
}

export type ArrivalRow = {
  readonly scanId: string
  readonly guestGroupId: string
  readonly arrivedCount: number
  readonly scannedAt: Date
  readonly voidedAt: Date | null
}

export interface DoorGroupReader {
  findByTokenHash(tokenHash: Buffer): Promise<DoorGroupRow | null>
  listByEvent(eventId: string): Promise<DoorGroupRow[]>
}

export interface ArrivalRepository {
  /** Devuelve `false` si el `scanId` ya existía: así la idempotencia vive en la base. */
  insertIfAbsent(row: ArrivalRow): Promise<boolean>
  listByEvent(eventId: string): Promise<ArrivalRow[]>
  findByScanId(scanId: string): Promise<ArrivalRow | null>
  adjust(scanId: string, arrivedCount: number): Promise<void>
  void(scanId: string, at: Date): Promise<void>
}
```

- [ ] **Paso 4: implementar el caso de uso**

`src/modules/checkin/application/check-in-by-scan.ts`:

```ts
import type { Minter } from '@/shared/security/tokens'
import { attempt, isErr, ok, type Result } from '@/shared/result'
import { createArrival } from '../domain/arrival'
import { resolveArrival } from '../domain/conflict'
import { checkinError, type CheckinError } from '../domain/errors'
import { parsePass } from '../domain/parse-pass'
import type { ArrivalRepository, DoorGroupReader, DoorGroupRow } from './ports'

export type ScanRequest = {
  readonly scanId: string
  readonly scanned: string
  readonly arrivedCount: number
  readonly scannedAt: Date
}

export type ScanGroupView = { readonly id: string; readonly label: string; readonly seats: number }

export type ScanOutcome =
  | { readonly scanId: string; readonly kind: 'welcome'; readonly group: ScanGroupView; readonly arrivedCount: number }
  | {
      readonly scanId: string
      readonly kind: 'already'
      readonly group: ScanGroupView
      readonly arrivedAt: Date
      readonly arrivedCount: number
    }
  | { readonly scanId: string; readonly kind: 'unknown' }

type Deps = { groups: DoorGroupReader; arrivals: ArrivalRepository; minter: Minter }

const view = (group: DoorGroupRow): ScanGroupView => ({ id: group.id, label: group.label, seats: group.seats })

/**
 * Recibe un lote desde el principio. Un escaneo en línea es un lote de uno; la bandeja
 * de salida manda lo acumulado tras un corte de red. Cada escaneo se resuelve por
 * separado: que uno venga corrupto no puede tumbar los demás.
 */
export const checkInByScan =
  (deps: Deps) =>
  async (input: { eventId: string; scans: readonly ScanRequest[] }): Promise<Result<ScanOutcome[], CheckinError>> =>
    attempt<ScanOutcome[], CheckinError>(
      async () => {
        const outcomes: ScanOutcome[] = []

        for (const scan of input.scans) {
          const token = parsePass(scan.scanned)
          if (isErr(token)) {
            outcomes.push({ scanId: scan.scanId, kind: 'unknown' })
            continue
          }

          const group = await deps.groups.findByTokenHash(deps.minter.hashOf(token.value))
          // El manifiesto del dispositivo es una caché, no una autoridad: aquí se vuelve
          // a comprobar que el grupo pertenece al evento de esta puerta. Sin esto, el
          // pase de otra boda de la misma plataforma abriría esta.
          if (!group || group.eventId !== input.eventId) {
            outcomes.push({ scanId: scan.scanId, kind: 'unknown' })
            continue
          }

          const arrival = createArrival(
            {
              scanId: scan.scanId,
              guestGroupId: group.id,
              arrivedCount: scan.arrivedCount,
              scannedAt: scan.scannedAt,
              voidedAt: null,
            },
            group.seats,
          )
          if (isErr(arrival)) {
            outcomes.push({ scanId: scan.scanId, kind: 'unknown' })
            continue
          }

          const previous = (await deps.arrivals.listByEvent(input.eventId)).filter((a) => a.guestGroupId === group.id)
          const inserted = await deps.arrivals.insertIfAbsent(arrival.value)
          const resolved = resolveArrival(
            inserted ? [...previous, arrival.value] : previous,
          )

          if (!inserted || previous.some((a) => a.voidedAt === null)) {
            outcomes.push(
              resolved
                ? { scanId: scan.scanId, kind: 'already', group: view(group), arrivedAt: resolved.arrivedAt, arrivedCount: resolved.arrivedCount }
                : { scanId: scan.scanId, kind: 'unknown' },
            )
            continue
          }

          outcomes.push({ scanId: scan.scanId, kind: 'welcome', group: view(group), arrivedCount: arrival.value.arrivedCount })
        }

        return ok(outcomes)
      },
      (cause) => checkinError('storage_failure', `No se pudieron registrar los escaneos: ${String(cause)}`),
    )
```

- [ ] **Paso 5: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/application/check-in-by-scan.test.ts`
Esperado: PASA, 8 casos.

- [ ] **Paso 6: commit**

```bash
git add src/modules/checkin/application/
git commit -m "feat: registro de lotes de escaneo, idempotente y atado a su evento"
```

---

## Task 7: Corregir y deshacer

**Archivos:**
- Crear: `src/modules/checkin/application/adjust-arrival.ts`
- Crear: `src/modules/checkin/application/void-arrival.ts`
- Test: `src/modules/checkin/application/adjust-and-void.test.ts`

**Interfaces:**
- Consume: `ArrivalRepository`, `DoorGroupReader` de `./ports`
- Produce:
  - `adjustArrival(deps)(input: { scanId, arrivedCount }): Promise<Result<void, CheckinError>>`
  - `voidArrival(deps)(input: { scanId }): Promise<Result<void, CheckinError>>`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/application/adjust-and-void.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { adjustArrival } from './adjust-arrival'
import { voidArrival } from './void-arrival'
import type { ArrivalRepository, ArrivalRow, DoorGroupReader, DoorGroupRow } from './ports'

const group: DoorGroupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 4,
  revoked: false,
  tokenHash: Buffer.alloc(0),
}

const fakes = (initial: ArrivalRow[] = []) => {
  const rows = [...initial]
  const arrivals: ArrivalRepository = {
    async insertIfAbsent() {
      return true
    },
    async listByEvent() {
      return rows
    },
    async findByScanId(scanId) {
      return rows.find((r) => r.scanId === scanId) ?? null
    },
    async adjust(scanId, arrivedCount) {
      const i = rows.findIndex((r) => r.scanId === scanId)
      if (i >= 0) rows[i] = { ...rows[i]!, arrivedCount }
    },
    async void(scanId, at) {
      const i = rows.findIndex((r) => r.scanId === scanId)
      if (i >= 0) rows[i] = { ...rows[i]!, voidedAt: at }
    },
  }
  const groups: DoorGroupReader = {
    async findByTokenHash() {
      return group
    },
    async listByEvent() {
      return [group]
    },
  }
  return { arrivals, groups, rows }
}

const row: ArrivalRow = {
  scanId: 's1',
  guestGroupId: 'g1',
  arrivedCount: 4,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
  voidedAt: null,
}

describe('adjustArrival', () => {
  it('baja la cantidad cuando llegaron menos', async () => {
    const { arrivals, groups, rows } = fakes([row])
    const r = await adjustArrival({ arrivals, groups })({ scanId: 's1', arrivedCount: 2 })
    expect(isOk(r)).toBe(true)
    expect(rows[0]?.arrivedCount).toBe(2)
  })

  it('rechaza pasarse de los cupos del grupo', async () => {
    const { arrivals, groups, rows } = fakes([row])
    const r = await adjustArrival({ arrivals, groups })({ scanId: 's1', arrivedCount: 9 })
    expect(isErr(r) && r.error.kind).toBe('invalid_count')
    expect(rows[0]?.arrivedCount).toBe(4)
  })

  it('un escaneo que no existe da not_found', async () => {
    const { arrivals, groups } = fakes([])
    const r = await adjustArrival({ arrivals, groups })({ scanId: 'nope', arrivedCount: 2 })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

describe('voidArrival', () => {
  it('deshacer pone lápida, no borra', async () => {
    const { arrivals, rows } = fakes([row])
    const r = await voidArrival({ arrivals, clock: () => new Date('2026-10-18T22:00:00Z') })({ scanId: 's1' })
    expect(isOk(r)).toBe(true)
    expect(rows[0]?.voidedAt?.toISOString()).toBe('2026-10-18T22:00:00.000Z')
  })

  it('deshacer dos veces no falla', async () => {
    const { arrivals } = fakes([row])
    const run = voidArrival({ arrivals, clock: () => new Date() })
    await run({ scanId: 's1' })
    expect(isOk(await run({ scanId: 's1' }))).toBe(true)
  })

  it('un escaneo que no existe da not_found', async () => {
    const { arrivals } = fakes([])
    const r = await voidArrival({ arrivals, clock: () => new Date() })({ scanId: 'nope' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/application/adjust-and-void.test.ts`
Esperado: FALLA, no existen los módulos.

- [ ] **Paso 3: implementar**

`src/modules/checkin/application/adjust-arrival.ts`:

```ts
import { attempt, err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository, DoorGroupReader } from './ports'

/**
 * La cantidad se corrige sobre el escaneo, no sobre el grupo: el registro es
 * append-only y la corrección es un dato del escaneo que la produjo.
 */
export const adjustArrival =
  (deps: { arrivals: ArrivalRepository; groups: DoorGroupReader }) =>
  async (input: { scanId: string; arrivedCount: number }): Promise<Result<void, CheckinError>> =>
    attempt<void, CheckinError>(
      async () => {
        const row = await deps.arrivals.findByScanId(input.scanId)
        if (!row) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))

        const all = await deps.groups.listByEvent('')
        const group = all.find((g) => g.id === row.guestGroupId)
        const seats = group?.seats ?? row.arrivedCount

        if (!Number.isInteger(input.arrivedCount) || input.arrivedCount < 1 || input.arrivedCount > seats) {
          return err(checkinError('invalid_count', `Cantidad inválida: ${input.arrivedCount} sobre ${seats} cupos`))
        }

        await deps.arrivals.adjust(input.scanId, input.arrivedCount)
        return ok(undefined)
      },
      (cause) => checkinError('storage_failure', `No se pudo corregir la llegada: ${String(cause)}`),
    )
```

> **Nota para el implementador:** `deps.groups.listByEvent('')` es incorrecto. Cambia la firma del puerto a `findGroupById(id: string): Promise<DoorGroupRow | null>` y añádela a `DoorGroupReader` en `ports.ts`, al adaptador de la Task 9 y a los dobles de esta prueba. El caso de uso queda:
>
> ```ts
> const group = await deps.groups.findGroupById(row.guestGroupId)
> const seats = group?.seats ?? row.arrivedCount
> ```

`src/modules/checkin/application/void-arrival.ts`:

```ts
import { attempt, err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository } from './ports'

/**
 * Deshacer no borra: escribe lápida. Queda auditoría de que alguien registró una
 * llegada y se retractó, que es lo que hace falta cuando la pareja pregunta al día
 * siguiente por qué el conteo no cuadra.
 */
export const voidArrival =
  (deps: { arrivals: ArrivalRepository; clock: () => Date }) =>
  async (input: { scanId: string }): Promise<Result<void, CheckinError>> =>
    attempt<void, CheckinError>(
      async () => {
        const row = await deps.arrivals.findByScanId(input.scanId)
        if (!row) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))

        await deps.arrivals.void(input.scanId, deps.clock())
        return ok(undefined)
      },
      (cause) => checkinError('storage_failure', `No se pudo deshacer la llegada: ${String(cause)}`),
    )
```

- [ ] **Paso 4: aplicar la nota, ejecutar y comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/application/`
Esperado: PASA, 14 casos entre los dos archivos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/application/
git commit -m "feat: corregir cuántos llegaron y deshacer con lápida"
```

---

## Task 8: Manifiesto y estado de la puerta

**Archivos:**
- Crear: `src/modules/checkin/application/get-door-manifest.ts`
- Crear: `src/modules/checkin/application/get-door-state.ts`
- Test: `src/modules/checkin/application/door-state.test.ts`

**Interfaces:**
- Produce:
  - `type DoorManifestGroup = { id, label, seats, attending, revoked, tokenHashHex }`
  - `type DoorManifest = { eventId, groups: DoorManifestGroup[], arrivals: ResolvedArrival[] }`
  - `getDoorManifest(deps)(eventId): Promise<Result<DoorManifest, CheckinError>>`
  - `getDoorState(deps)(eventId): Promise<Result<{ tally: DoorTally; groups: DoorGroup[]; arrivals: ResolvedArrival[] }, CheckinError>>`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/application/door-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isOk } from '@/shared/result'
import { getDoorManifest } from './get-door-manifest'
import { getDoorState } from './get-door-state'
import type { ArrivalRepository, ArrivalRow, DoorGroupReader, DoorGroupRow } from './ports'

const group: DoorGroupRow = {
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  attending: 3,
  revoked: false,
  tokenHash: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
}

const arrival: ArrivalRow = {
  scanId: 's1',
  guestGroupId: 'g1',
  arrivedCount: 3,
  scannedAt: new Date('2026-10-18T21:00:00Z'),
  voidedAt: null,
}

const fakes = (rows: ArrivalRow[] = []) => ({
  groups: {
    async findByTokenHash() {
      return group
    },
    async findGroupById() {
      return group
    },
    async listByEvent() {
      return [group]
    },
  } as DoorGroupReader,
  arrivals: {
    async insertIfAbsent() {
      return true
    },
    async listByEvent() {
      return rows
    },
    async findByScanId() {
      return null
    },
    async adjust() {},
    async void() {},
  } as ArrivalRepository,
})

describe('getDoorManifest', () => {
  it('entrega el hash en hexadecimal, nunca un token en claro', async () => {
    const { groups, arrivals } = fakes()
    const r = await getDoorManifest({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.groups[0]?.tokenHashHex).toBe('deadbeef')
  })

  it('el manifiesto no expone ningún campo llamado token', async () => {
    const { groups, arrivals } = fakes()
    const r = await getDoorManifest({ groups, arrivals })('e1')
    const json = JSON.stringify(isOk(r) ? r.value : {})
    expect(json).not.toContain('"token"')
    expect(json).not.toContain('tokenHash"')
  })

  it('incluye las llegadas ya resueltas para arrancar con el contador puesto', async () => {
    const { groups, arrivals } = fakes([arrival])
    const r = await getDoorManifest({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.arrivals[0]?.arrivedCount).toBe(3)
  })
})

describe('getDoorState', () => {
  it('devuelve el conteo con las llegadas aplicadas', async () => {
    const { groups, arrivals } = fakes([arrival])
    const r = await getDoorState({ groups, arrivals })('e1')
    expect(isOk(r) && r.value.tally.arrivedGroups).toBe(1)
    expect(isOk(r) && r.value.tally.headsInside).toBe(3)
    expect(isOk(r) && r.value.tally.expectedHeads).toBe(3)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/application/door-state.test.ts`
Esperado: FALLA, no existen los módulos.

- [ ] **Paso 3: implementar**

`src/modules/checkin/application/get-door-manifest.ts`:

```ts
import { attempt, ok, type Result } from '@/shared/result'
import { resolveArrival, type ResolvedArrival } from '../domain/conflict'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository, DoorGroupReader } from './ports'

export type DoorManifestGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly attending: number | null
  readonly revoked: boolean
  /** SHA-256 en hexadecimal. Nunca el token en claro. */
  readonly tokenHashHex: string
}

export type DoorManifest = {
  readonly eventId: string
  readonly groups: readonly DoorManifestGroup[]
  readonly arrivals: readonly ResolvedArrival[]
}

/**
 * Lo que el dispositivo de la puerta precarga para funcionar sin red. Lleva hashes, no
 * tokens: si roban el celular de la puerta, de ahí no salen enlaces utilizables.
 */
export const getDoorManifest =
  (deps: { groups: DoorGroupReader; arrivals: ArrivalRepository }) =>
  async (eventId: string): Promise<Result<DoorManifest, CheckinError>> =>
    attempt<DoorManifest, CheckinError>(
      async () => {
        const [groups, arrivals] = await Promise.all([
          deps.groups.listByEvent(eventId),
          deps.arrivals.listByEvent(eventId),
        ])

        const byGroup = new Map<string, typeof arrivals>()
        for (const row of arrivals) {
          byGroup.set(row.guestGroupId, [...(byGroup.get(row.guestGroupId) ?? []), row])
        }

        const resolved: ResolvedArrival[] = []
        for (const rows of byGroup.values()) {
          const one = resolveArrival(rows)
          if (one) resolved.push(one)
        }

        return ok({
          eventId,
          groups: groups.map((g) => ({
            id: g.id,
            label: g.label,
            seats: g.seats,
            attending: g.attending,
            revoked: g.revoked,
            tokenHashHex: g.tokenHash.toString('hex'),
          })),
          arrivals: resolved,
        })
      },
      (cause) => checkinError('storage_failure', `No se pudo leer el manifiesto: ${String(cause)}`),
    )
```

`src/modules/checkin/application/get-door-state.ts`:

```ts
import { attempt, isErr, ok, type Result } from '@/shared/result'
import type { ResolvedArrival } from '../domain/conflict'
import { doorTally, type DoorGroup, type DoorTally } from '../domain/door-tally'
import { checkinError, type CheckinError } from '../domain/errors'
import { getDoorManifest } from './get-door-manifest'
import type { ArrivalRepository, DoorGroupReader } from './ports'

export type DoorState = {
  readonly tally: DoorTally
  readonly groups: readonly DoorGroup[]
  readonly arrivals: readonly ResolvedArrival[]
}

export const getDoorState =
  (deps: { groups: DoorGroupReader; arrivals: ArrivalRepository }) =>
  async (eventId: string): Promise<Result<DoorState, CheckinError>> =>
    attempt<DoorState, CheckinError>(
      async () => {
        const manifest = await getDoorManifest(deps)(eventId)
        if (isErr(manifest)) return manifest

        const groups: DoorGroup[] = manifest.value.groups.map((g) => ({
          id: g.id,
          label: g.label,
          seats: g.seats,
          attending: g.attending,
          revoked: g.revoked,
        }))

        return ok({ tally: doorTally(groups, manifest.value.arrivals), groups, arrivals: manifest.value.arrivals })
      },
      (cause) => checkinError('storage_failure', `No se pudo leer el estado de la puerta: ${String(cause)}`),
    )
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/application/door-state.test.ts`
Esperado: PASA, 4 casos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/application/
git commit -m "feat: manifiesto de puerta con hashes y estado en vivo"
```

---

## Task 9: Adaptador Drizzle

**Archivos:**
- Crear: `src/modules/checkin/infrastructure/drizzle-arrival-repository.ts`
- Test: `src/modules/checkin/infrastructure/drizzle-arrival-repository.test.ts`

**Interfaces:**
- Consume: `ArrivalRepository`, `DoorGroupReader` de `../application/ports`; `db`, `DbExecutor` de `@/shared/db/client`
- Produce: `createDrizzleArrivalRepository(db)`, `drizzleArrivalRepository`, `createDrizzleDoorGroupReader(db)`, `drizzleDoorGroupReader`

- [ ] **Paso 1: escribir la prueba que falla**

Sigue el montaje de `src/modules/rsvp/infrastructure/drizzle-rsvp-repository.test.ts`: prueba contra el Postgres real del 5434, creando evento y grupo propios y limpiando al final.

`src/modules/checkin/infrastructure/drizzle-arrival-repository.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events, guestGroups } from '@/shared/db/schema'
import { eq } from 'drizzle-orm'
import { drizzleArrivalRepository, drizzleDoorGroupReader } from './drizzle-arrival-repository'

const eventId = crypto.randomUUID()
const groupId = crypto.randomUUID()
const hash = Buffer.from('0'.repeat(64), 'hex')

beforeAll(async () => {
  await db.insert(events).values({
    id: eventId,
    slug: `puerta-${eventId.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2026-10-18',
    rsvpDeadline: '2026-10-01',
    locale: 'es',
    themeKey: 'ivory',
    status: 'published',
  })
  await db.insert(guestGroups).values({ id: groupId, eventId, label: 'Familia Prueba', seats: 4, tokenHash: hash })
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
})

describe('drizzleArrivalRepository', () => {
  it('inserta una llegada y la lee por evento', async () => {
    const scanId = crypto.randomUUID()
    const inserted = await drizzleArrivalRepository.insertIfAbsent({
      scanId,
      guestGroupId: groupId,
      arrivedCount: 3,
      scannedAt: new Date(),
      voidedAt: null,
    })
    expect(inserted).toBe(true)
    const rows = await drizzleArrivalRepository.listByEvent(eventId)
    expect(rows.some((r) => r.scanId === scanId)).toBe(true)
  })

  it('el mismo scanId no entra dos veces: la idempotencia vive en la base', async () => {
    const scanId = crypto.randomUUID()
    const row = { scanId, guestGroupId: groupId, arrivedCount: 2, scannedAt: new Date(), voidedAt: null }
    expect(await drizzleArrivalRepository.insertIfAbsent(row)).toBe(true)
    expect(await drizzleArrivalRepository.insertIfAbsent(row)).toBe(false)
  })

  it('deshacer escribe lápida y la fila sigue ahí', async () => {
    const scanId = crypto.randomUUID()
    await drizzleArrivalRepository.insertIfAbsent({
      scanId,
      guestGroupId: groupId,
      arrivedCount: 1,
      scannedAt: new Date(),
      voidedAt: null,
    })
    await drizzleArrivalRepository.void(scanId, new Date())
    const row = await drizzleArrivalRepository.findByScanId(scanId)
    expect(row?.voidedAt).not.toBeNull()
  })

  it('el lector de grupos entrega el hash, y solo el hash', async () => {
    const group = await drizzleDoorGroupReader.findByTokenHash(hash)
    expect(group?.id).toBe(groupId)
    expect(group?.tokenHash.equals(hash)).toBe(true)
    expect(Object.keys(group ?? {})).not.toContain('token')
  })

  it('borrar el evento se lleva las llegadas por cascada', async () => {
    const otro = crypto.randomUUID()
    const otroGrupo = crypto.randomUUID()
    await db.insert(events).values({
      id: otro,
      slug: `puerta-${otro.slice(0, 8)}`,
      title: 'Efímera',
      eventDate: '2026-10-18',
      rsvpDeadline: '2026-10-01',
      locale: 'es',
      themeKey: 'ivory',
      status: 'draft',
    })
    await db.insert(guestGroups).values({
      id: otroGrupo,
      eventId: otro,
      label: 'X',
      seats: 1,
      tokenHash: Buffer.from('1'.repeat(64), 'hex'),
    })
    await drizzleArrivalRepository.insertIfAbsent({
      scanId: crypto.randomUUID(),
      guestGroupId: otroGrupo,
      arrivedCount: 1,
      scannedAt: new Date(),
      voidedAt: null,
    })
    await db.delete(events).where(eq(events.id, otro))
    expect(await drizzleArrivalRepository.listByEvent(otro)).toHaveLength(0)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm test src/modules/checkin/infrastructure/`
Esperado: FALLA, no existe el módulo.

- [ ] **Paso 3: implementar**

`src/modules/checkin/infrastructure/drizzle-arrival-repository.ts`:

```ts
import { and, desc, eq } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { arrivals, guestGroups, rsvpResponses } from '@/shared/db/schema'
import type { ArrivalRepository, DoorGroupReader, DoorGroupRow } from '../application/ports'

export const createDrizzleArrivalRepository = (database: DbExecutor): ArrivalRepository => ({
  async insertIfAbsent(row) {
    // `onConflictDoNothing` sobre `scan_id` convierte la idempotencia en una garantía de
    // la base, no en una comprobación de la aplicación que una carrera podría saltarse.
    const inserted = await database
      .insert(arrivals)
      .values({
        scanId: row.scanId,
        guestGroupId: row.guestGroupId,
        arrivedCount: row.arrivedCount,
        scannedAt: row.scannedAt,
        voidedAt: row.voidedAt,
      })
      .onConflictDoNothing({ target: arrivals.scanId })
      .returning({ scanId: arrivals.scanId })

    return inserted.length > 0
  },

  async listByEvent(eventId) {
    return database
      .select({
        scanId: arrivals.scanId,
        guestGroupId: arrivals.guestGroupId,
        arrivedCount: arrivals.arrivedCount,
        scannedAt: arrivals.scannedAt,
        voidedAt: arrivals.voidedAt,
      })
      .from(arrivals)
      .innerJoin(guestGroups, eq(guestGroups.id, arrivals.guestGroupId))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(desc(arrivals.scannedAt))
  },

  async findByScanId(scanId) {
    const [row] = await database
      .select({
        scanId: arrivals.scanId,
        guestGroupId: arrivals.guestGroupId,
        arrivedCount: arrivals.arrivedCount,
        scannedAt: arrivals.scannedAt,
        voidedAt: arrivals.voidedAt,
      })
      .from(arrivals)
      .where(eq(arrivals.scanId, scanId))
      .limit(1)
    return row ?? null
  },

  async adjust(scanId, arrivedCount) {
    await database.update(arrivals).set({ arrivedCount }).where(eq(arrivals.scanId, scanId))
  },

  async void(scanId, at) {
    await database.update(arrivals).set({ voidedAt: at }).where(eq(arrivals.scanId, scanId))
  },
})

const latestAttending = (database: DbExecutor) =>
  database
    .selectDistinctOn([rsvpResponses.guestGroupId], {
      guestGroupId: rsvpResponses.guestGroupId,
      attending: rsvpResponses.attending,
    })
    .from(rsvpResponses)
    .orderBy(rsvpResponses.guestGroupId, desc(rsvpResponses.respondedAt))
    .as('latest')

const toRow = (r: {
  id: string
  eventId: string
  label: string
  seats: number
  attending: number | null
  revokedAt: Date | null
  tokenHash: Buffer
}): DoorGroupRow => ({
  id: r.id,
  eventId: r.eventId,
  label: r.label,
  seats: r.seats,
  attending: r.attending,
  revoked: r.revokedAt !== null,
  tokenHash: r.tokenHash,
})

export const createDrizzleDoorGroupReader = (database: DbExecutor): DoorGroupReader => ({
  async findByTokenHash(tokenHash) {
    const latest = latestAttending(database)
    const [row] = await database
      .select({
        id: guestGroups.id,
        eventId: guestGroups.eventId,
        label: guestGroups.label,
        seats: guestGroups.seats,
        attending: latest.attending,
        revokedAt: guestGroups.revokedAt,
        tokenHash: guestGroups.tokenHash,
      })
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      .where(eq(guestGroups.tokenHash, tokenHash))
      .limit(1)
    return row ? toRow(row) : null
  },

  async findGroupById(id) {
    const latest = latestAttending(database)
    const [row] = await database
      .select({
        id: guestGroups.id,
        eventId: guestGroups.eventId,
        label: guestGroups.label,
        seats: guestGroups.seats,
        attending: latest.attending,
        revokedAt: guestGroups.revokedAt,
        tokenHash: guestGroups.tokenHash,
      })
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      .where(eq(guestGroups.id, id))
      .limit(1)
    return row ? toRow(row) : null
  },

  async listByEvent(eventId) {
    const latest = latestAttending(database)
    const rows = await database
      .select({
        id: guestGroups.id,
        eventId: guestGroups.eventId,
        label: guestGroups.label,
        seats: guestGroups.seats,
        attending: latest.attending,
        revokedAt: guestGroups.revokedAt,
        tokenHash: guestGroups.tokenHash,
      })
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(guestGroups.label)
    return rows.map(toRow)
  },
})

export const drizzleArrivalRepository = createDrizzleArrivalRepository(db)
export const drizzleDoorGroupReader = createDrizzleDoorGroupReader(db)
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm test src/modules/checkin/infrastructure/`
Esperado: PASA, 5 casos.

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/infrastructure/
git commit -m "feat: adaptador Postgres de llegadas, con idempotencia en la base"
```

---

## Task 10: Composición, acciones y barril

**Archivos:**
- Crear: `src/modules/checkin/actions.ts`
- Crear: `src/modules/checkin/index.ts`
- Modificar: `src/app/composition/container.ts`

**Interfaces:**
- Produce:
  - `checkin.record`, `checkin.adjust`, `checkin.void`, `checkin.manifest`, `checkin.state` en el contenedor
  - `recordScansAction(input): Promise<ScanOutcomeDto[]>`
  - `adjustArrivalAction(input)`, `voidArrivalAction(input)`, `refreshManifestAction(eventId)`

- [ ] **Paso 1: añadir el módulo al contenedor**

En `src/app/composition/container.ts`, junto a los demás:

```ts
import { adjustArrival } from '@/modules/checkin/application/adjust-arrival'
import { checkInByScan } from '@/modules/checkin/application/check-in-by-scan'
import { getDoorManifest } from '@/modules/checkin/application/get-door-manifest'
import { getDoorState } from '@/modules/checkin/application/get-door-state'
import { voidArrival } from '@/modules/checkin/application/void-arrival'
import {
  drizzleArrivalRepository,
  drizzleDoorGroupReader,
} from '@/modules/checkin/infrastructure/drizzle-arrival-repository'
```

Y el objeto, después de `rsvp`:

```ts
export const checkin = {
  record: checkInByScan({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository, minter }),
  adjust: adjustArrival({ arrivals: drizzleArrivalRepository, groups: drizzleDoorGroupReader }),
  void: voidArrival({ arrivals: drizzleArrivalRepository, clock }),
  manifest: getDoorManifest({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
  state: getDoorState({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
} as const
```

- [ ] **Paso 2: escribir las acciones**

`src/modules/checkin/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { checkin } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'
import type { DoorManifest } from './application/get-door-manifest'
import type { ScanOutcome } from './application/check-in-by-scan'

export type ScanInput = {
  scanId: string
  scanned: string
  arrivedCount: number
  /** Milisegundos desde época: el reloj del dispositivo cruza como número. */
  scannedAtMs: number
}

/**
 * Recibe el lote acumulado en la bandeja de salida del dispositivo. Devuelve un
 * resultado por `scanId` para que el cliente pueda vaciar solo lo aceptado.
 */
export async function recordScansAction(input: { eventId: string; eventSlug: string; scans: ScanInput[] }): Promise<ScanOutcome[]> {
  await requireSession()

  const result = await checkin.record({
    eventId: input.eventId,
    scans: input.scans.map((s) => ({
      scanId: s.scanId,
      scanned: s.scanned,
      arrivedCount: s.arrivedCount,
      scannedAt: new Date(s.scannedAtMs),
    })),
  })

  if (isErr(result)) {
    console.error('registro de escaneos rechazado', result.error.kind, result.error.detail)
    throw new Error(result.error.kind)
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
  return result.value
}

export async function adjustArrivalAction(input: { scanId: string; arrivedCount: number; eventSlug: string }): Promise<void> {
  await requireSession()

  const result = await checkin.adjust({ scanId: input.scanId, arrivedCount: input.arrivedCount })
  if (isErr(result)) console.error('corrección rechazada', result.error.kind, result.error.detail)

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
}

export async function voidArrivalAction(input: { scanId: string; eventSlug: string }): Promise<void> {
  await requireSession()

  const result = await checkin.void({ scanId: input.scanId })
  if (isErr(result)) console.error('deshacer rechazado', result.error.kind, result.error.detail)

  revalidatePath(`/panel/eventos/${input.eventSlug}/puerta`)
}

export async function refreshManifestAction(eventId: string): Promise<DoorManifest | null> {
  await requireSession()

  const result = await checkin.manifest(eventId)
  if (isErr(result)) {
    console.error('manifiesto rechazado', result.error.kind, result.error.detail)
    return null
  }
  return result.value
}
```

`src/modules/checkin/index.ts`:

```ts
export type { CheckinError, CheckinErrorKind } from './domain/errors'
export type { Arrival } from './domain/arrival'
export type { ResolvedArrival } from './domain/conflict'
export type { DoorGroup, DoorTally } from './domain/door-tally'
export { parsePass } from './domain/parse-pass'
export { doorTally } from './domain/door-tally'
export { resolveArrival } from './domain/conflict'
export type { DoorManifest, DoorManifestGroup } from './application/get-door-manifest'
export type { ScanOutcome } from './application/check-in-by-scan'
export type { ArrivalRepository, DoorGroupReader } from './application/ports'
```

- [ ] **Paso 3: comprobar fronteras y tipos**

```bash
pnpm typecheck && pnpm lint && DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm verify:boundaries
```
Esperado: todo en verde. Si `verify:boundaries` falla, el módulo está importando fuera de su capa: corrígelo, no relajes la política.

- [ ] **Paso 4: commit**

```bash
git add src/modules/checkin/actions.ts src/modules/checkin/index.ts src/app/composition/container.ts
git commit -m "feat: acciones de puerta tras sesión y cableado en la raíz de composición"
```

---

## Task 11: Tokens de diseño y tarjeta de resultado

**Archivos:**
- Modificar: `src/shared/design/tokens.css`
- Crear: `src/modules/checkin/ui/ScanResultCard.tsx`
- Test: `src/modules/checkin/ui/ScanResultCard.test.tsx`

**Interfaces:**
- Consume: `ScanOutcome` de `../application/check-in-by-scan`
- Produce: `<ScanResultCard outcome onAdjust onUndo onDismiss />`

- [ ] **Paso 1: añadir los tokens**

En `src/shared/design/tokens.css`, dentro del mismo `:root` que los demás:

```css
  /* Semáforo de la puerta. Es el único sitio donde pueden vivir estos colores. */
  --color-ok: #5a705c;
  --color-ok-deep: #3f5340;
  --color-warn: #b48c44;
  --color-warn-deep: #7d5f22;
  --color-danger: #a3553a;
  --color-danger-deep: #6d2716;
```

- [ ] **Paso 2: escribir la prueba que falla**

`src/modules/checkin/ui/ScanResultCard.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ScanResultCard } from './ScanResultCard'

const group = { id: 'g1', label: 'Familia Rojas Peña', seats: 4 }
const noop = () => {}

describe('ScanResultCard', () => {
  it('da la bienvenida y dice cuántos entraron', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 3 }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByText(/Bienvenid/i)).toBeInTheDocument()
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
    expect(screen.getByLabelText('Personas que entraron')).toHaveTextContent('3')
  })

  it('avisa del pase repetido con la hora del primero', () => {
    render(
      <ScanResultCard
        outcome={{
          scanId: 's1',
          kind: 'already',
          group,
          arrivedAt: new Date('2026-10-18T21:05:00Z'),
          arrivedCount: 3,
        }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByText(/ya había ingresado/i)).toBeInTheDocument()
  })

  it('el pase desconocido no muestra ningún nombre', () => {
    render(
      <ScanResultCard outcome={{ scanId: 's1', kind: 'unknown' }} onAdjust={noop} onUndo={noop} onDismiss={noop} />,
    )
    expect(screen.getByText(/no es de tu evento/i)).toBeInTheDocument()
    expect(screen.queryByText('Familia Rojas Peña')).not.toBeInTheDocument()
  })

  it('bajar la cantidad avisa hacia arriba', () => {
    const onAdjust = vi.fn()
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 3 }}
        onAdjust={onAdjust}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Una persona menos' }))
    expect(onAdjust).toHaveBeenCalledWith('s1', 2)
  })

  it('no deja bajar de una persona ni pasar de los cupos', () => {
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 1 }}
        onAdjust={noop}
        onUndo={noop}
        onDismiss={noop}
      />,
    )
    expect(screen.getByRole('button', { name: 'Una persona menos' })).toBeDisabled()
  })

  it('deshacer avisa hacia arriba', () => {
    const onUndo = vi.fn()
    render(
      <ScanResultCard
        outcome={{ scanId: 's1', kind: 'welcome', group, arrivedCount: 2 }}
        onAdjust={noop}
        onUndo={onUndo}
        onDismiss={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(onUndo).toHaveBeenCalledWith('s1')
  })
})
```

- [ ] **Paso 3: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/ScanResultCard.test.tsx`
Esperado: FALLA, no existe el componente.

- [ ] **Paso 4: implementar**

`src/modules/checkin/ui/ScanResultCard.tsx`:

```tsx
'use client'

import type { ScanOutcome } from '../application/check-in-by-scan'

type Props = {
  outcome: ScanOutcome
  onAdjust: (scanId: string, arrivedCount: number) => void
  onUndo: (scanId: string) => void
  onDismiss: () => void
}

const skin = {
  welcome: 'bg-[var(--color-ok)]',
  already: 'bg-[var(--color-warn)]',
  unknown: 'bg-[var(--color-danger)]',
} as const

const hora = (d: Date) => d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

/**
 * El personal de puerta mira esta tarjeta de reojo, con poca luz y una fila detrás: el
 * color y el titular tienen que bastar sin leer el resto.
 */
export function ScanResultCard({ outcome, onAdjust, onUndo, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${skin[outcome.kind]} fixed inset-x-0 bottom-0 z-30 rounded-t-3xl p-6 text-white shadow-float motion-safe:animate-[slide-up_320ms_cubic-bezier(.22,1,.36,1)] md:inset-x-auto md:left-1/2 md:bottom-5 md:w-[min(560px,92vw)] md:-translate-x-1/2 md:rounded-3xl`}
    >
      {outcome.kind === 'unknown' ? (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] opacity-85">✕ Pase no válido</p>
          <p className="mt-2 font-display text-[30px] italic leading-tight">Este código no es de tu evento</p>
          <p className="mt-1.5 text-[13px] opacity-80">Puede ser el pase de otra fiesta, o un QR cualquiera.</p>
        </>
      ) : (
        <>
          <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] opacity-85">
            {outcome.kind === 'welcome' ? '✓ Bienvenidos' : '! Ya había ingresado'}
          </p>
          <p className="mt-2 font-display text-[30px] italic leading-tight">{outcome.group.label}</p>
          <p className="mt-1.5 text-[13px] opacity-80">
            {outcome.group.seats} cupo{outcome.group.seats === 1 ? '' : 's'}
            {outcome.kind === 'already' ? ` · registrado a las ${hora(outcome.arrivedAt)}` : ''}
          </p>

          {outcome.kind === 'welcome' ? (
            <div className="mt-4 flex items-center gap-3 text-[13px]">
              <span className="opacity-80">¿Cuántos entraron?</span>
              <div className="ml-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-black/20 p-1">
                <button
                  type="button"
                  aria-label="Una persona menos"
                  disabled={outcome.arrivedCount <= 1}
                  onClick={() => onAdjust(outcome.scanId, outcome.arrivedCount - 1)}
                  className="size-[34px] rounded-full bg-white/15 text-[17px] disabled:opacity-30"
                >
                  −
                </button>
                <span aria-label="Personas que entraron" className="min-w-6 text-center font-mono text-[18px] font-semibold">
                  {outcome.arrivedCount}
                </span>
                <button
                  type="button"
                  aria-label="Una persona más"
                  disabled={outcome.arrivedCount >= outcome.group.seats}
                  onClick={() => onAdjust(outcome.scanId, outcome.arrivedCount + 1)}
                  className="size-[34px] rounded-full bg-white/15 text-[17px] disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-5 flex gap-2.5">
        {outcome.kind === 'welcome' ? (
          <button
            type="button"
            onClick={() => onUndo(outcome.scanId)}
            className="flex-1 rounded-full border border-white/30 bg-black/20 px-4 py-3.5 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)]"
          >
            Deshacer
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 rounded-full bg-white px-4 py-3.5 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink"
        >
          {outcome.kind === 'welcome' ? 'Siguiente invitado' : 'Cerrar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Paso 5: comprobar que pasa y commitear**

```bash
pnpm test src/modules/checkin/ui/ScanResultCard.test.tsx
git add src/shared/design/tokens.css src/modules/checkin/ui/
git commit -m "feat: tarjeta de resultado del escaneo y semáforo en los tokens"
```

---

## Task 12: Buscador por nombre

**Archivos:**
- Crear: `src/modules/checkin/ui/DoorSearchSheet.tsx`
- Test: `src/modules/checkin/ui/DoorSearchSheet.test.tsx`

**Interfaces:**
- Consume: `DoorManifestGroup` de `../application/get-door-manifest`
- Produce: `<DoorSearchSheet groups arrivedIds open onPick onClose />`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/ui/DoorSearchSheet.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DoorSearchSheet } from './DoorSearchSheet'

const groups = [
  { id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, tokenHashHex: 'aa' },
  { id: 'g2', label: 'Ana Lucía Vega', seats: 2, attending: 2, revoked: false, tokenHashHex: 'bb' },
  { id: 'g3', label: 'Zulema Castro', seats: 1, attending: null, revoked: true, tokenHashHex: 'cc' },
]

describe('DoorSearchSheet', () => {
  it('lista los grupos que faltan por llegar, en orden alfabético', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={() => {}} onClose={() => {}} />)
    const filas = screen.getAllByRole('button', { name: /cupo/i })
    expect(filas[0]).toHaveTextContent('Ana Lucía Vega')
    expect(filas[1]).toHaveTextContent('Familia Rojas Peña')
  })

  it('filtra por nombre', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'rojas' } })
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
    expect(screen.queryByText('Ana Lucía Vega')).not.toBeInTheDocument()
  })

  it('encuentra también a quien tenía la invitación revocada', () => {
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'zulema' } })
    expect(screen.getByText('Zulema Castro')).toBeInTheDocument()
    expect(screen.getByText(/invitación revocada/i)).toBeInTheDocument()
  })

  it('marca a quien ya llegó y no deja registrarlo otra vez desde aquí', () => {
    render(
      <DoorSearchSheet groups={groups} arrivedIds={new Set(['g1'])} open onPick={() => {}} onClose={() => {}} />,
    )
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'rojas' } })
    expect(screen.getByText(/ya llegó/i)).toBeInTheDocument()
  })

  it('elegir un grupo avisa hacia arriba con su id', () => {
    const onPick = vi.fn()
    render(<DoorSearchSheet groups={groups} arrivedIds={new Set()} open onPick={onPick} onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/nombre del grupo/i), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: /Ana Lucía Vega/ }))
    expect(onPick).toHaveBeenCalledWith('g2')
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/DoorSearchSheet.test.tsx`
Esperado: FALLA, no existe el componente.

- [ ] **Paso 3: implementar**

`src/modules/checkin/ui/DoorSearchSheet.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { DoorManifestGroup } from '../application/get-door-manifest'

type Props = {
  groups: readonly DoorManifestGroup[]
  arrivedIds: ReadonlySet<string>
  open: boolean
  onPick: (groupId: string) => void
  onClose: () => void
}

/**
 * La salida cuando el pase no se puede leer: sin celular, sin batería, con la pantalla
 * rota, o con el QR impreso y arrugado. Busca sobre todos los grupos, también los
 * revocados: quien aparece en la puerta aparece, y el personal decide.
 */
export function DoorSearchSheet({ groups, arrivedIds, open, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const ordenados = [...groups].sort((a, b) => a.label.localeCompare(b.label, 'es'))
    if (!needle) return ordenados.filter((g) => !arrivedIds.has(g.id) && !g.revoked).slice(0, 20)
    return ordenados.filter((g) => g.label.toLowerCase().includes(needle)).slice(0, 20)
  }, [groups, arrivedIds, query])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg text-ink">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <h2 className="font-display text-[22px] italic">Buscar invitado</h2>
        <button type="button" aria-label="Cerrar" onClick={onClose} className="ml-auto size-10 rounded-full border border-line bg-bg-raised">
          ✕
        </button>
      </div>

      <div className="p-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre del grupo..."
          autoComplete="off"
          className="w-full rounded-full border border-line bg-bg-sunken px-4 py-3 text-[14px]"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {hits.length === 0 ? (
          <p className="p-10 text-center text-[12px] text-ink-mute">Ningún grupo coincide.</p>
        ) : (
          hits.map((g) => {
            const llego = arrivedIds.has(g.id)
            return (
              <button
                key={g.id}
                type="button"
                disabled={llego}
                onClick={() => onPick(g.id)}
                className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-line bg-bg-raised p-3.5 text-left text-[14px] disabled:opacity-60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block">{g.label}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-mute">
                    {g.seats} cupo{g.seats === 1 ? '' : 's'}
                    {g.attending === null ? ' · sin confirmar' : ` · confirmaron ${g.attending}`}
                    {g.revoked ? ' · invitación revocada' : ''}
                  </span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
                  {llego ? 'Ya llegó' : 'Registrar'}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Paso 4: comprobar que pasa y commitear**

```bash
pnpm test src/modules/checkin/ui/DoorSearchSheet.test.tsx
git add src/modules/checkin/ui/DoorSearchSheet.tsx src/modules/checkin/ui/DoorSearchSheet.test.tsx
git commit -m "feat: buscador de grupos dentro del modo puerta"
```

---

## Task 13: Modo puerta y su ruta

**Archivos:**
- Crear: `src/modules/checkin/ui/DoorMode.tsx`
- Crear: `src/app/(panel)/panel/eventos/[slug]/puerta/page.tsx`
- Modificar: `src/app/(panel)/panel/eventos/[slug]/page.tsx`
- Test: `src/modules/checkin/ui/DoorMode.test.tsx`

**Interfaces:**
- Consume: `DoorManifest`, `ScanResultCard`, `DoorSearchSheet`, `recordScansAction`
- Produce: `<DoorMode eventId eventSlug manifest />`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/ui/DoorMode.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DoorMode } from './DoorMode'

vi.mock('../actions', () => ({
  recordScansAction: vi.fn(async ({ scans }) => [
    { scanId: scans[0].scanId, kind: 'welcome', group: { id: 'g1', label: 'Familia Rojas Peña', seats: 4 }, arrivedCount: 4 },
  ]),
  adjustArrivalAction: vi.fn(async () => {}),
  voidArrivalAction: vi.fn(async () => {}),
  refreshManifestAction: vi.fn(async () => null),
}))

const manifest = {
  eventId: 'e1',
  groups: [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, tokenHashHex: 'aa' }],
  arrivals: [],
}

describe('DoorMode', () => {
  it('muestra el contador de llegadas sobre los esperados', () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    expect(screen.getByLabelText('Grupos que han llegado')).toHaveTextContent('0')
    expect(screen.getByText(/de 1/)).toBeInTheDocument()
  })

  it('un lector de códigos por teclado registra al pulsar Enter', async () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    for (const ch of 'AbCdEfGhIjKlMnOpQrStUv') fireEvent.keyDown(document, { key: ch })
    fireEvent.keyDown(document, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument())
  })

  it('abre el buscador por nombre', () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    fireEvent.click(screen.getByRole('button', { name: /buscar por nombre/i }))
    expect(screen.getByPlaceholderText(/nombre del grupo/i)).toBeInTheDocument()
  })

  it('avisa cuando la cámara no puede abrirse por falta de contexto seguro', async () => {
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    await waitFor(() => expect(screen.getByText(/cámara/i)).toBeInTheDocument())
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/DoorMode.test.tsx`
Esperado: FALLA, no existe el componente.

- [ ] **Paso 3: implementar `DoorMode`**

Porta la maqueta de `public/dashboard/dashboard.js`, sección "Modo puerta". Reglas que **no** se negocian al portar:

- El bucle de escaneo va sobre `setTimeout` a **110 ms**, nunca `requestAnimationFrame`: con la pestaña de fondo baja a un fotograma por segundo y el escáner se para solo.
- `BarcodeDetector` cuando exista, `jsQR` de respaldo.
- Los elementos que se ocultan con `hidden` necesitan `[hidden]{display:none}` explícito si su clase declara `display`.
- Ventana de gracia de 2,6 s por código, contada **desde que se cierra** la tarjeta.
- La barra inferior se apaga mientras hay tarjeta: sus botones caen en el mismo punto.

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recordScansAction } from '../actions'
import type { ScanOutcome } from '../application/check-in-by-scan'
import type { DoorManifest } from '../application/get-door-manifest'
import { doorTally } from '../domain/door-tally'
import { DoorSearchSheet } from './DoorSearchSheet'
import { ScanResultCard } from './ScanResultCard'

const SCAN_MS = 110
const GRACE_MS = 2600

export function DoorMode({ eventId, eventSlug, manifest }: { eventId: string; eventSlug: string; manifest: DoorManifest }) {
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [arrivals, setArrivals] = useState(manifest.arrivals)
  const [cameraMessage, setCameraMessage] = useState('Encendiendo la cámara…')
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const typedRef = useRef<{ buffer: string; at: number }>({ buffer: '', at: 0 })

  const arrivedIds = useMemo(() => new Set(arrivals.map((a) => a.guestGroupId)), [arrivals])
  const tally = useMemo(
    () => doorTally(manifest.groups.map((g) => ({ ...g })), arrivals),
    [manifest.groups, arrivals],
  )

  const submit = useCallback(
    async (scanned: string, arrivedCount: number) => {
      const scanId = crypto.randomUUID()
      const [result] = await recordScansAction({
        eventId,
        eventSlug,
        scans: [{ scanId, scanned, arrivedCount, scannedAtMs: Date.now() }],
      })
      if (!result) return
      setOutcome(result)
      if (result.kind === 'welcome') {
        setArrivals((prev) => [
          ...prev,
          { guestGroupId: result.group.id, arrivedAt: new Date(), arrivedCount: result.arrivedCount, scanCount: 1 },
        ])
      }
    },
    [eventId, eventSlug],
  )

  const onCode = useCallback(
    (raw: string) => {
      const now = Date.now()
      if (raw === lastRef.current.code && now - lastRef.current.at < GRACE_MS) return
      lastRef.current = { code: raw, at: now }
      const group = manifest.groups.find((g) => !arrivedIds.has(g.id))
      void submit(raw, group?.attending ?? 1)
    },
    [manifest.groups, arrivedIds, submit],
  )

  // Un lector de códigos por USB o Bluetooth se comporta como un teclado: teclea el
  // código de golpe y remata con Enter. Aquí no hay campo donde escribir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || outcome) return
      if (e.key === 'Enter') {
        const code = typedRef.current.buffer
        typedRef.current.buffer = ''
        if (code) onCode(code)
        return
      }
      if (e.key.length !== 1) return
      if (Date.now() - typedRef.current.at > 1200) typedRef.current.buffer = ''
      typedRef.current.at = Date.now()
      typedRef.current.buffer = (typedRef.current.buffer + e.key).slice(-64)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCode, sheetOpen, outcome])

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const start = async () => {
      if (!window.isSecureContext) {
        setCameraMessage('La cámara necesita HTTPS o localhost. Busca al invitado por su nombre.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      } catch {
        setCameraMessage('No se pudo abrir la cámara. Busca al invitado por su nombre.')
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})
      setCameraMessage('')

      const detector = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null
      const tick = async () => {
        if (stopped) return
        timer = setTimeout(() => void tick(), SCAN_MS)
        if (outcome || sheetOpen || video.readyState !== video.HAVE_ENOUGH_DATA) return
        if (!detector) return
        const codes = await detector.detect(video).catch(() => [])
        const first = codes[0]
        if (first?.rawValue) onCode(first.rawValue)
      }
      void tick()
    }

    void start()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode, outcome, sheetOpen])

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/85" />

      <header className="relative z-10 flex items-center gap-3 p-4 text-white">
        <span className="font-mono text-[11px] tracking-[var(--tracking-luxe)]">
          <b aria-label="Grupos que han llegado" className="font-mono text-[19px] font-semibold">
            {tally.arrivedGroups}
          </b>{' '}
          <span className="opacity-55">de {tally.expectedGroups} · {tally.headsInside} dentro</span>
        </span>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        {cameraMessage ? <p className="max-w-80 text-center text-[13px] text-white/70">{cameraMessage}</p> : null}
      </div>

      {outcome ? null : (
        <div className="relative z-10 p-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-full border border-white/30 bg-black/40 px-4 py-4 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-white"
          >
            ⌕ Buscar por nombre
          </button>
        </div>
      )}

      {outcome ? (
        <ScanResultCard
          outcome={outcome}
          onAdjust={() => {}}
          onUndo={() => setOutcome(null)}
          onDismiss={() => {
            lastRef.current = { code: lastRef.current.code, at: Date.now() }
            setOutcome(null)
          }}
        />
      ) : null}

      <DoorSearchSheet
        groups={manifest.groups}
        arrivedIds={arrivedIds}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={(groupId) => {
          setSheetOpen(false)
          const group = manifest.groups.find((g) => g.id === groupId)
          if (group) void submit(group.tokenHashHex, group.attending ?? 1)
        }}
      />
    </div>
  )
}
```

> **Nota para el implementador:** `onPick` no puede mandar `tokenHashHex` como si fuera un pase — el servidor espera un token, no su hash. Añade a `actions.ts` una acción `checkInByGroupAction({ eventId, eventSlug, groupId, arrivedCount, scanId, scannedAtMs })` y un caso de uso `checkInByGroup` que salte `parsePass` y resuelva el grupo por id, con la misma comprobación de que pertenece al evento. Cubre con una prueba de aplicación: «registrar por id de grupo no acepta un grupo de otro evento». Lo mismo aplica al `arrivedCount` inicial en `onCode`, que debe salir del grupo que resuelva el servidor, no de una búsqueda a ciegas en el cliente: en línea, deja que el servidor decida el valor por defecto (`attending ?? 1`) y devuélvelo en `ScanOutcome`.

- [ ] **Paso 4: crear la ruta**

`src/app/(panel)/panel/eventos/[slug]/puerta/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { checkin, events } from '@/app/composition/container'
import { DoorMode } from '@/modules/checkin/ui/DoorMode'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export default async function DoorPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const manifest = await checkin.manifest(event.value.id)
  if (isErr(manifest)) throw new Error(manifest.error.detail)

  return <DoorMode eventId={event.value.id} eventSlug={event.value.slug} manifest={manifest.value} />
}
```

- [ ] **Paso 5: enlazar desde la página del evento**

En `src/app/(panel)/panel/eventos/[slug]/page.tsx`, dentro del `<header>`, antes del enlace «Volver»:

```tsx
<Link
  className="rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink"
  href={`/panel/eventos/${event.value.slug}/puerta`}
>
  Modo puerta
</Link>
```

- [ ] **Paso 6: comprobar y commitear**

```bash
pnpm test src/modules/checkin/ && pnpm typecheck && pnpm lint
git add src/modules/checkin/ui/DoorMode.tsx src/modules/checkin/ui/DoorMode.test.tsx 'src/app/(panel)/panel/eventos/[slug]/'
git commit -m "feat: modo puerta a pantalla completa con su ruta en el panel"
```

---

## Task 14: QR del pase en la página del invitado

**Archivos:**
- Modificar: `src/app/(guest)/i/[token]/page.tsx`
- Crear: `src/modules/checkin/ui/PassQr.tsx`
- Test: `src/modules/checkin/ui/PassQr.test.tsx`
- Modificar: `package.json` (dependencia `qrcode`)

**Interfaces:**
- Produce: `<PassQr url label />` — genera el QR en el servidor como SVG en línea

- [ ] **Paso 1: instalar la dependencia**

```bash
pnpm add qrcode && pnpm add -D @types/qrcode
```

- [ ] **Paso 2: escribir la prueba que falla**

`src/modules/checkin/ui/PassQr.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PassQr } from './PassQr'

describe('PassQr', () => {
  it('dibuja un QR con la dirección del pase', async () => {
    render(await PassQr({ url: 'https://invitepremium.bo/i/AbCdEfGhIjKlMnOpQrStUv', label: 'Familia Rojas Peña' }))
    expect(screen.getByRole('img', { name: /pase de entrada/i })).toBeInTheDocument()
  })

  it('nunca imprime el token como texto legible', async () => {
    const { container } = render(
      await PassQr({ url: 'https://invitepremium.bo/i/AbCdEfGhIjKlMnOpQrStUv', label: 'Familia Rojas Peña' }),
    )
    expect(container.textContent).not.toContain('AbCdEfGhIjKlMnOpQrStUv')
  })
})
```

- [ ] **Paso 3: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/PassQr.test.tsx`
Esperado: FALLA, no existe el componente.

- [ ] **Paso 4: implementar**

`src/modules/checkin/ui/PassQr.tsx`:

```tsx
import QRCode from 'qrcode'

/**
 * El QR se dibuja en el servidor: el invitado abre su enlace y ya lo tiene, sin
 * descargar librería ninguna. El token viaja dentro del dibujo, nunca como texto que
 * alguien pueda leer por encima del hombro.
 */
export async function PassQr({ url, label }: { url: string; label: string }) {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })

  return (
    <section className="mx-auto flex w-fit flex-col items-center gap-3 rounded-2xl border border-line bg-bg-raised p-6">
      <p className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Pase de entrada</p>
      <div
        role="img"
        aria-label={`Pase de entrada de ${label}`}
        className="w-40 [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-center text-[12px] text-ink-soft">Muéstralo en la entrada.</p>
    </section>
  )
}
```

- [ ] **Paso 5: colocarlo en la página del invitado**

En `src/app/(guest)/i/[token]/page.tsx`, tras el bloque de RSVP, con la URL que ya se construye con `invitationUrl(token, env.SITE_URL)`:

```tsx
<PassQr url={invitationUrl(token, env.SITE_URL)} label={invitation.group.label} />
```

- [ ] **Paso 6: comprobar y commitear**

```bash
pnpm test src/modules/checkin/ui/PassQr.test.tsx && pnpm typecheck && pnpm lint
git add package.json pnpm-lock.yaml src/modules/checkin/ui/PassQr.tsx src/modules/checkin/ui/PassQr.test.tsx 'src/app/(guest)/i/[token]/page.tsx'
git commit -m "feat: el invitado ve su pase como QR en su propia invitación"
```

---

## Task 15: e2e del check-in en línea

**Archivos:**
- Crear: `tests/e2e/checkin.spec.ts`

- [ ] **Paso 1: escribir la prueba**

Sigue el montaje de `tests/e2e/panel.spec.ts` para iniciar sesión. La cámara se sustituye por un `MediaStream` de canvas con un QR real: es la técnica con la que ya se validó la maqueta de punta a punta.

```ts
import { expect, test } from '@playwright/test'

test('un pase escaneado registra la llegada del grupo', async ({ page, context }) => {
  await context.grantPermissions(['camera'])

  // 1. Sesión y evento con un grupo. Reutiliza los ayudantes de panel.spec.ts.
  await page.goto('/panel/entrar')
  // ...iniciar sesión con el usuario de pruebas...

  // 2. Crea un grupo y quédate con el enlace que solo se muestra una vez.
  const url = await page.getByTestId('invitation-url').innerText()

  // 3. Abre el modo puerta y sustituye la cámara por un canvas con el QR.
  await page.goto('/panel/eventos/boda-de-prueba/puerta')
  await page.addInitScript((passUrl: string) => {
    // El QR se dibuja con la misma librería que usa la página del invitado.
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    // ...dibujar el QR de `passUrl` en el canvas...
    const fake = canvas.captureStream(30)
    navigator.mediaDevices.getUserMedia = async () => fake
  }, url)
  await page.reload()

  // 4. La tarjeta verde aparece y el contador sube.
  await expect(page.getByText(/Bienvenidos/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('1')
})

test('el lector por teclado registra sin cámara', async ({ page }) => {
  // ...sesión y evento...
  await page.goto('/panel/eventos/boda-de-prueba/puerta')
  const token = 'AbCdEfGhIjKlMnOpQrStUv' // el token real del grupo creado
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Bienvenidos/i)).toBeVisible()
})
```

> **Nota para el implementador:** los tres `...` de arriba son el único sitio del plan donde falta código, y es a propósito: el arranque de sesión y la creación del evento ya existen en `tests/e2e/panel.spec.ts` y hay que reutilizarlos tal cual, no reescribirlos. Extrae esos pasos a `tests/e2e/helpers/panel.ts` en esta misma tarea y llámalos desde los dos ficheros.

- [ ] **Paso 2: ejecutar**

```bash
pnpm test:e2e checkin
```
Esperado: PASA. Si el inicio de sesión falla dos veces seguidas, es el limitador de intentos (3 por minuto y por cuenta, en memoria): reinicia el servidor o espera un minuto.

- [ ] **Paso 3: commit**

```bash
git add tests/e2e/
git commit -m "test: e2e del check-in, con la cámara sustituida por un canvas"
```

---

# FASE B — Sin conexión

## Task 16: Bandeja de salida en IndexedDB

**Archivos:**
- Crear: `src/modules/checkin/ui/outbox.ts`
- Test: `src/modules/checkin/ui/outbox.test.ts`

**Interfaces:**
- Produce:
  - `type PendingScan = { scanId, scanned, arrivedCount, scannedAtMs, tries }`
  - `openOutbox(): Promise<Outbox>` con `push`, `all`, `drop(scanIds)`, `bumpTries`, `count`

- [ ] **Paso 1: instalar el entorno de prueba**

```bash
pnpm add -D fake-indexeddb
```

- [ ] **Paso 2: escribir la prueba que falla**

`src/modules/checkin/ui/outbox.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { openOutbox } from './outbox'

const scan = (scanId: string) => ({
  scanId,
  scanned: 'AbCdEfGhIjKlMnOpQrStUv',
  arrivedCount: 2,
  scannedAtMs: Date.parse('2026-10-18T21:00:00Z'),
  tries: 0,
})

describe('outbox', () => {
  beforeEach(async () => {
    const box = await openOutbox()
    await box.drop((await box.all()).map((s) => s.scanId))
  })

  it('guarda un escaneo y lo devuelve', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    expect((await box.all()).map((s) => s.scanId)).toEqual(['s1'])
  })

  it('sobrevive a cerrar y volver a abrir: es la razón de existir', async () => {
    await (await openOutbox()).push(scan('s1'))
    expect(await (await openOutbox()).count()).toBe(1)
  })

  it('el mismo scanId no se acumula dos veces', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.push(scan('s1'))
    expect(await box.count()).toBe(1)
  })

  it('vacía solo lo aceptado y deja el resto', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.push(scan('s2'))
    await box.drop(['s1'])
    expect((await box.all()).map((s) => s.scanId)).toEqual(['s2'])
  })

  it('mantiene el orden de llegada, que es el orden en que hay que reenviar', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.push(scan('s2'))
    await box.push(scan('s3'))
    expect((await box.all()).map((s) => s.scanId)).toEqual(['s1', 's2', 's3'])
  })

  it('cuenta los intentos para poder rendirse con criterio', async () => {
    const box = await openOutbox()
    await box.push(scan('s1'))
    await box.bumpTries(['s1'])
    expect((await box.all())[0]?.tries).toBe(1)
  })
})
```

- [ ] **Paso 3: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/outbox.test.ts`
Esperado: FALLA, no existe el módulo.

- [ ] **Paso 4: implementar**

`src/modules/checkin/ui/outbox.ts`:

```ts
export type PendingScan = {
  readonly scanId: string
  readonly scanned: string
  readonly arrivedCount: number
  readonly scannedAtMs: number
  readonly tries: number
}

export type Outbox = {
  push(scan: PendingScan): Promise<void>
  all(): Promise<PendingScan[]>
  drop(scanIds: readonly string[]): Promise<void>
  bumpTries(scanIds: readonly string[]): Promise<void>
  count(): Promise<number>
}

const DB_NAME = 'invite-door'
const STORE = 'outbox'
const VERSION = 1

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      // `seq` autoincremental conserva el orden de llegada, que es el orden en que hay
      // que reenviar: la corrección de una cantidad no puede adelantar a su registro.
      const store = req.result.createObjectStore(STORE, { keyPath: 'scanId' })
      store.createIndex('seq', 'seq', { unique: false })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

/**
 * El escaneo se escribe aquí ANTES de intentar subirlo, y la pantalla responde de
 * inmediato. Un salón sin wifi no puede dejar a la puerta esperando a un servidor, y un
 * escaneo perdido es un invitado que se queda fuera.
 */
export async function openOutbox(): Promise<Outbox> {
  const db = await open()
  let seq = 0

  const tx = <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T> | T): Promise<T> => {
    const store = db.transaction(STORE, mode).objectStore(STORE)
    return Promise.resolve(run(store))
  }

  return {
    async push(scan) {
      await tx('readwrite', async (store) => {
        const existing = await request(store.get(scan.scanId))
        if (existing) return
        await request(store.put({ ...scan, seq: seq++ }))
      })
    },
    async all() {
      const rows = await tx('readonly', (store) => request(store.getAll() as IDBRequest<(PendingScan & { seq: number })[]>))
      return rows.sort((a, b) => a.seq - b.seq).map(({ seq: _seq, ...scan }) => scan)
    },
    async drop(scanIds) {
      await tx('readwrite', async (store) => {
        for (const id of scanIds) await request(store.delete(id))
      })
    },
    async bumpTries(scanIds) {
      await tx('readwrite', async (store) => {
        for (const id of scanIds) {
          const row = await request(store.get(id))
          if (row) await request(store.put({ ...row, tries: (row.tries ?? 0) + 1 }))
        }
      })
    },
    async count() {
      return tx('readonly', (store) => request(store.count()))
    },
  }
}
```

- [ ] **Paso 5: comprobar que pasa y commitear**

```bash
pnpm test src/modules/checkin/ui/outbox.test.ts
git add package.json pnpm-lock.yaml src/modules/checkin/ui/outbox.ts src/modules/checkin/ui/outbox.test.ts
git commit -m "feat: bandeja de salida de escaneos en IndexedDB"
```

---

## Task 17: Resolución local contra el manifiesto

**Archivos:**
- Crear: `src/modules/checkin/ui/local-resolve.ts`
- Test: `src/modules/checkin/ui/local-resolve.test.ts`

**Interfaces:**
- Consume: `parsePass` del dominio, `DoorManifestGroup`
- Produce:
  - `sha256Hex(text: string): Promise<string>`
  - `resolveLocally(scanned, groups, arrivedIds): Promise<LocalOutcome>` con `kind: 'welcome' | 'already' | 'unknown'`

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/ui/local-resolve.test.ts`:

```ts
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { resolveLocally, sha256Hex } from './local-resolve'

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
const HASH = createHash('sha256').update(TOKEN).digest('hex')

const groups = [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, tokenHashHex: HASH }]

describe('sha256Hex', () => {
  it('produce el mismo hash que el servidor', async () => {
    // El servidor usa createHash('sha256').update(token) sobre la misma cadena.
    expect(await sha256Hex(TOKEN)).toBe(HASH)
  })
})

describe('resolveLocally', () => {
  it('reconoce un pase del evento sin preguntar al servidor', async () => {
    const r = await resolveLocally(`https://x.bo/i/${TOKEN}`, groups, new Set())
    expect(r.kind).toBe('welcome')
    expect(r.group?.label).toBe('Familia Rojas Peña')
    expect(r.arrivedCount).toBe(4)
  })

  it('avisa de repetido si el grupo ya está registrado', async () => {
    const r = await resolveLocally(TOKEN, groups, new Set(['g1']))
    expect(r.kind).toBe('already')
  })

  it('un pase de otro evento no está en el manifiesto: desconocido', async () => {
    const r = await resolveLocally('ZzYyXxWwVvUuTtSsRrQqPp', groups, new Set())
    expect(r.kind).toBe('unknown')
  })

  it('un QR de la calle es desconocido sin llegar a hashear', async () => {
    expect((await resolveLocally('https://coca-cola.com', groups, new Set())).kind).toBe('unknown')
  })

  it('arranca en 1 cuando el grupo no confirmó', async () => {
    const sinConfirmar = [{ ...groups[0]!, attending: null }]
    const r = await resolveLocally(TOKEN, sinConfirmar, new Set())
    expect(r.arrivedCount).toBe(1)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/local-resolve.test.ts`
Esperado: FALLA, no existe el módulo.

- [ ] **Paso 3: implementar**

`src/modules/checkin/ui/local-resolve.ts`:

```ts
import { isErr } from '@/shared/result'
import { parsePass } from '../domain/parse-pass'
import type { DoorManifestGroup } from '../application/get-door-manifest'

export type LocalOutcome = {
  readonly kind: 'welcome' | 'already' | 'unknown'
  readonly group?: DoorManifestGroup
  readonly arrivedCount?: number
}

/**
 * Mismo algoritmo y misma entrada que `createTokenMinter().hashOf` en el servidor:
 * SHA-256 sobre los bytes UTF-8 del token. Web Crypto exige contexto seguro, que la
 * cámara ya exige de todas formas.
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * La puerta decide verde, ámbar o rojo sin servidor, con el mismo `parsePass` del
 * dominio. El manifiesto lleva hashes, nunca tokens: si roban el celular, de aquí no
 * salen enlaces utilizables.
 */
export async function resolveLocally(
  scanned: string,
  groups: readonly DoorManifestGroup[],
  arrivedIds: ReadonlySet<string>,
): Promise<LocalOutcome> {
  const token = parsePass(scanned)
  if (isErr(token)) return { kind: 'unknown' }

  const hash = await sha256Hex(token.value)
  const group = groups.find((g) => g.tokenHashHex === hash)
  if (!group) return { kind: 'unknown' }

  if (arrivedIds.has(group.id)) return { kind: 'already', group, arrivedCount: group.attending ?? 1 }
  return { kind: 'welcome', group, arrivedCount: group.attending ?? 1 }
}
```

- [ ] **Paso 4: comprobar que pasa y commitear**

```bash
pnpm test src/modules/checkin/ui/local-resolve.test.ts
git add src/modules/checkin/ui/local-resolve.ts src/modules/checkin/ui/local-resolve.test.ts
git commit -m "feat: la puerta resuelve el pase en local contra hashes precargados"
```

---

## Task 18: Enganchar la puerta a la bandeja de salida

**Archivos:**
- Modificar: `src/modules/checkin/ui/DoorMode.tsx`
- Test: `src/modules/checkin/ui/DoorMode.offline.test.tsx`

**Interfaces:**
- Consume: `openOutbox`, `resolveLocally`, `recordScansAction`
- Produce: `DoorMode` con indicador de pendientes y reenviador

- [ ] **Paso 1: escribir la prueba que falla**

`src/modules/checkin/ui/DoorMode.offline.test.tsx`:

```tsx
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DoorMode } from './DoorMode'

const recordScansAction = vi.fn()
vi.mock('../actions', () => ({
  recordScansAction: (...args: unknown[]) => recordScansAction(...args),
  adjustArrivalAction: vi.fn(async () => {}),
  voidArrivalAction: vi.fn(async () => {}),
  refreshManifestAction: vi.fn(async () => null),
}))

// Hash de 'AbCdEfGhIjKlMnOpQrStUv', el mismo que produce el servidor.
const HASH = '...' // rellénalo con createHash('sha256').update(TOKEN).digest('hex')
const manifest = {
  eventId: 'e1',
  groups: [{ id: 'g1', label: 'Familia Rojas Peña', seats: 4, attending: 4, revoked: false, tokenHashHex: HASH }],
  arrivals: [],
}

const escanear = (token: string) => {
  for (const ch of token) fireEvent.keyDown(document, { key: ch })
  fireEvent.keyDown(document, { key: 'Enter' })
}

describe('DoorMode sin conexión', () => {
  it('da la bienvenida aunque el servidor no responda', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear('AbCdEfGhIjKlMnOpQrStUv')
    await waitFor(() => expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument())
  })

  it('muestra cuántos escaneos faltan por subir', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear('AbCdEfGhIjKlMnOpQrStUv')
    await waitFor(() => expect(screen.getByLabelText('Escaneos por subir')).toHaveTextContent('1'))
  })

  it('al volver la red sube lo acumulado y el contador vuelve a cero', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear('AbCdEfGhIjKlMnOpQrStUv')
    await waitFor(() => expect(screen.getByLabelText('Escaneos por subir')).toHaveTextContent('1'))

    recordScansAction.mockResolvedValue([
      { scanId: expect.any(String), kind: 'welcome', group: { id: 'g1', label: 'Familia Rojas Peña', seats: 4 }, arrivedCount: 4 },
    ])
    fireEvent(window, new Event('online'))
    await waitFor(() => expect(screen.getByLabelText('Escaneos por subir')).toHaveTextContent('0'))
  })

  it('no duplica al reenviar: el scanId es el mismo', async () => {
    recordScansAction.mockRejectedValue(new Error('offline'))
    render(<DoorMode eventId="e1" eventSlug="boda" manifest={manifest} />)
    escanear('AbCdEfGhIjKlMnOpQrStUv')
    await waitFor(() => expect(recordScansAction).toHaveBeenCalled())
    const primero = recordScansAction.mock.calls[0]?.[0].scans[0].scanId

    fireEvent(window, new Event('online'))
    await waitFor(() => expect(recordScansAction.mock.calls.length).toBeGreaterThan(1))
    const segundo = recordScansAction.mock.calls.at(-1)?.[0].scans[0].scanId
    expect(segundo).toBe(primero)
  })
})
```

- [ ] **Paso 2: comprobar que falla**

Ejecuta: `pnpm test src/modules/checkin/ui/DoorMode.offline.test.tsx`
Esperado: FALLA, la puerta todavía habla directamente con el servidor.

- [ ] **Paso 3: reescribir el flujo de `submit` en `DoorMode.tsx`**

Sustituye el `submit` de la Task 13 por este, y añade el estado y el reenviador:

```tsx
const [pending, setPending] = useState(0)
const outboxRef = useRef<Awaited<ReturnType<typeof openOutbox>> | null>(null)

useEffect(() => {
  void openOutbox().then(async (box) => {
    outboxRef.current = box
    setPending(await box.count())
  })
}, [])

/** Sube lo acumulado. Se llama al registrar, al volver la red, al volver a primer plano
 *  y cada treinta segundos mientras quede algo. */
const flush = useCallback(async () => {
  const box = outboxRef.current
  if (!box) return
  const batch = await box.all()
  if (batch.length === 0) return

  try {
    const outcomes = await recordScansAction({
      eventId,
      eventSlug,
      scans: batch.map(({ tries: _tries, ...scan }) => scan),
    })
    await box.drop(outcomes.map((o) => o.scanId))
  } catch {
    // Sin red: el lote se queda donde está. Nada se pierde y nada se descarta.
    await box.bumpTries(batch.map((s) => s.scanId))
  }
  setPending(await box.count())
}, [eventId, eventSlug])

useEffect(() => {
  const onOnline = () => void flush()
  const timer = setInterval(() => void flush(), 30_000)
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onOnline)
  return () => {
    clearInterval(timer)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onOnline)
  }
}, [flush])

const submit = useCallback(
  async (scanned: string) => {
    // La pantalla responde con lo que decide el dispositivo, no con lo que diga la red.
    const local = await resolveLocally(scanned, manifest.groups, arrivedIds)
    const scanId = crypto.randomUUID()

    if (local.kind === 'unknown') {
      setOutcome({ scanId, kind: 'unknown' })
      return
    }

    const group = { id: local.group!.id, label: local.group!.label, seats: local.group!.seats }
    const arrivedCount = local.arrivedCount ?? 1

    if (local.kind === 'already') {
      setOutcome({ scanId, kind: 'already', group, arrivedAt: new Date(), arrivedCount })
      return
    }

    setOutcome({ scanId, kind: 'welcome', group, arrivedCount })
    setArrivals((prev) => [...prev, { guestGroupId: group.id, arrivedAt: new Date(), arrivedCount, scanCount: 1 }])

    const box = outboxRef.current
    if (box) {
      await box.push({ scanId, scanned, arrivedCount, scannedAtMs: Date.now(), tries: 0 })
      setPending(await box.count())
    }
    void flush()
  },
  [manifest.groups, arrivedIds, flush],
)
```

Y en la cabecera, junto al contador:

```tsx
{pending > 0 ? (
  <span aria-label="Escaneos por subir" className="ml-auto rounded-full bg-[var(--color-warn)] px-3 py-1 font-mono text-[10px]">
    {pending} por subir
  </span>
) : (
  <span aria-label="Escaneos por subir" className="sr-only">
    0
  </span>
)}
```

- [ ] **Paso 4: comprobar que pasa**

Ejecuta: `pnpm test src/modules/checkin/ui/`
Esperado: PASA, incluidas las pruebas de la Task 13 (ajústalas si el cambio de `submit` movió alguna aserción).

- [ ] **Paso 5: commit**

```bash
git add src/modules/checkin/ui/
git commit -m "feat: la puerta responde en local y sube los escaneos cuando puede"
```

---

## Task 19: PWA instalable

**Archivos:**
- Crear: `public/manifest.webmanifest`
- Crear: `src/app/sw.ts`
- Modificar: `next.config.ts`
- Modificar: `src/app/(panel)/panel/eventos/[slug]/puerta/page.tsx` (metadatos)
- Modificar: `package.json`

- [ ] **Paso 1: instalar Serwist**

```bash
pnpm add @serwist/next serwist
```

- [ ] **Paso 2: escribir el manifiesto**

`public/manifest.webmanifest`:

```json
{
  "name": "InvitePremium · Puerta",
  "short_name": "Puerta",
  "description": "Check-in de invitados el día del evento.",
  "start_url": "/panel",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f8f6f1",
  "theme_color": "#1a1a1d",
  "icons": [
    { "src": "/icons/door-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/door-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

> Genera los dos PNG a partir del logotipo existente. Sin ellos el navegador no ofrece instalar.

- [ ] **Paso 3: escribir el Service Worker**

`src/app/sw.ts`:

```ts
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * El Service Worker SOLO sirve recursos. No escribe, no sincroniza en segundo plano y
 * no toca la base: toda escritura pasa por la página, con sesión. Un trabajador que
 * escribiera por su cuenta sería un camino a la base sin `requireSession()`.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

- [ ] **Paso 4: envolver la configuración**

En `next.config.ts`, conservando todo lo que ya tiene:

```ts
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // El Service Worker se versiona con el build: si no, un despliegue nuevo deja a la
  // puerta sirviendo el JS de ayer.
  disable: process.env.NODE_ENV === 'development',
})

export default withSerwist(nextConfig)
```

- [ ] **Paso 5: enlazar el manifiesto**

En `src/app/(panel)/panel/eventos/[slug]/puerta/page.tsx`:

```ts
export const metadata = {
  title: 'Modo puerta',
  manifest: '/manifest.webmanifest',
}
```

- [ ] **Paso 6: comprobar contra la imagen, no contra el servidor de desarrollo**

`disable` apaga Serwist en desarrollo, así que probarlo con `pnpm dev` **no prueba nada**. Es la misma lección que dejó `robots.txt`.

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3200 pnpm build
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3200 pnpm start --port 3200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3200/sw.js
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3200/manifest.webmanifest
```
Esperado: 200 en ambos.

- [ ] **Paso 7: commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts src/app/sw.ts public/manifest.webmanifest public/icons/ 'src/app/(panel)/panel/eventos/[slug]/puerta/page.tsx'
git commit -m "feat: la puerta se instala como aplicación y cachea sus recursos"
```

---

## Task 20: e2e sin conexión y cierre

**Archivos:**
- Modificar: `tests/e2e/checkin.spec.ts`
- Modificar: `CLAUDE.md`

- [ ] **Paso 1: escribir la prueba**

Añade a `tests/e2e/checkin.spec.ts`:

```ts
test('sin red la puerta sigue registrando, y sube al volver', async ({ page, context }) => {
  // ...sesión, evento con un grupo, y el token del pase...
  await page.goto('/panel/eventos/boda-de-prueba/puerta')

  await context.setOffline(true)
  await page.keyboard.type(token)
  await page.keyboard.press('Enter')

  // La bienvenida sale igual: la decide el dispositivo, no la red.
  await expect(page.getByText(/Bienvenidos/i)).toBeVisible()
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/1/)

  await context.setOffline(false)
  await expect(page.getByLabel('Escaneos por subir')).toHaveText(/0/, { timeout: 40_000 })

  // Y la llegada está de verdad en la base, no solo en la pantalla.
  await page.goto('/panel/eventos/boda-de-prueba/puerta')
  await expect(page.getByLabel('Grupos que han llegado')).toHaveText('1')
})
```

- [ ] **Paso 2: ejecutar la suite entera**

```bash
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm test
pnpm typecheck && pnpm lint
DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000 pnpm verify:boundaries
pnpm test:e2e
```
Esperado: todo en verde.

- [ ] **Paso 3: actualizar `CLAUDE.md`**

Cambia el estado del ciclo 3 para reflejar que la rebanada 3 está cerrada, y corrige la nota que decía que el check-in necesitaba route handlers: no los usa, y el motivo está en la sección 6 del spec. Añade a la lista de comandos que la puerta se prueba **contra la imagen**, porque Serwist está apagado en desarrollo.

- [ ] **Paso 4: commit**

```bash
git add tests/e2e/ CLAUDE.md
git commit -m "test: e2e de la puerta sin conexión, y estado del proyecto al día"
```

---

## Autorrevisión del plan

**Cobertura del spec:**

| Sección del spec | Tarea |
|---|---|
| 4.1 Lo escaneado | 2 |
| 4.2 Una llegada | 3 |
| 4.3 Conteo | 5 |
| 4.4 Conflicto | 4 |
| 5 Esquema | 1 |
| 6 Rutas y acciones | 10, 13 |
| 6.1 Resultado del escaneo | 6 |
| 7.1 Precarga | 8 |
| 7.2 Validación local | 17 |
| 7.3 Bandeja de salida | 16, 18 |
| 7.4 PWA | 19 |
| 8 Seguridad | 6 (evento correcto), 8 (hashes), 10 (`requireSession`), 11 (tokens) |
| 8.1 Pase estático | decisión, sin código |
| 9 Errores | 6, 13 |
| 10 Pruebas | en cada tarea + 15, 20 |
| 11 Despliegue | 1, 19 |

Sin huecos.

**Dos deudas señaladas dentro del plan**, ambas con instrucciones para resolverlas en su tarea:

1. Task 7 usa `deps.groups.listByEvent('')`, que es incorrecto. La nota indica añadir `findGroupById` al puerto y propagarlo a la Task 9 y a los dobles.
2. Task 13 manda `tokenHashHex` como si fuera un pase al elegir desde el buscador. La nota indica añadir `checkInByGroupAction` y `checkInByGroup`, con la misma comprobación de evento.

Ambas son deliberadas: se descubren al escribir el código de esas tareas y arreglarlas allí sale más barato que rehacer el puerto dos veces.

**Consistencia de tipos:** `ScanOutcome`, `DoorManifestGroup`, `ResolvedArrival`, `DoorGroup` y `ArrivalRow` se usan con los mismos nombres y formas en todas las tareas que los tocan.
