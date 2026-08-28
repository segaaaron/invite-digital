# Los dieciséis temas de boda y XV años — plan de implementación

> **Para quien lo ejecute:** este plan se ejecuta **en la sesión, sin subagentes**
> (regla del usuario, `CLAUDE.md`). Los pasos llevan casilla (`- [ ]`) para ir marcando.
> Antes de cada tarea con lógica, `superpowers:test-driven-development`. Antes de decir
> que algo está hecho, `superpowers:verification-before-completion`.

**Objetivo:** que los ocho diseños de boda y los ocho de XV años de la maqueta
`VallHallaWwepApp` sean temas de invitación reales —elegibles en el panel, visibles en la
web y recibidos por el invitado— fieles al diseño original: mismos iconos, animaciones,
tipografías, fondos y disposición.

**Arquitectura:** un kit compartido con los 46 auxiliares portados una sola vez, y un
componente por diseño que los compone con su marcado y su paleta exactos. El contenido
rico vive en `event_content` (jsonb validado en el dominio) y se siembra con el del
diseño sin pisar lo que el atelier escriba. Las imágenes del evento viven fuera de
`public/` y se sirven con la misma puerta de contraseña que la invitación.

**Tecnologías:** Next 16 (App Router, Server Components), React 19, TypeScript strict,
Drizzle + Postgres 16, Tailwind v4, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-27-catalogo-invitaciones-design.md`

**Maqueta de origen:**
`/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/VallHallaWwepApp`
(ruta con espacios: entrecomíllala siempre)

---

## Restricciones globales

Se aplican a **todas** las tareas. No se repiten en cada una.

- **pnpm exclusivamente.** Nunca npm ni yarn.
- **Base y compilación** necesitan siempre:
  `DATABASE_URL=postgres://invite:invite@localhost:5434/invite SITE_URL=http://localhost:3000`
- TypeScript strict con `noUncheckedIndexedAccess`. **Prohibido `any` y `@ts-ignore`.**
- **Ningún hexadecimal fuera de `tokens.css`**, con la excepción ampliada por el spec: la
  paleta de un tema es dato del tema, declarada en su `ThemeDefinition`. **Cero
  hexadecimales sueltos en `themes/kit/`** — el kit recibe todo color por prop.
- **Toda clave de diccionario nueva** va en `src/shared/i18n/dictionary.ts` **y** en
  `es.ts` **y** en `en.ts`, en el mismo commit. El typecheck falla si falta alguna.
- **Toda Server Action del panel** empieza por `requireSession()` **en su propio cuerpo**
  y sigue con `requireEventAccess(actor, ref)`. Nunca delegado en un ayudante:
  `verify:tenancy` no lo ve.
- **Ninguna Server Action devuelve `Promise<void>`** con el fallo en `console.error`.
  Patrón `{ status, message }` por `useActionState`, y **la pantalla lo pinta**.
- **Toda migración** va dada de alta en `db/migrations/meta/_journal.json` y tiene que
  poder aplicarse **dos veces**: `if not exists` en todo `create`/`alter`, y
  `drop constraint if exists` delante de cada `add constraint`.
- **Un token o identificador desconocido responde 404, nunca 403.**
- **Toda animación respeta `prefers-reduced-motion: reduce`**, y sin animación el
  contenido queda **visible**, nunca en `opacity: 0`.
- **Un solo `<main>` por página.** Los temas emiten `<article>`.
- Estado que la maqueta abriría con un botón va **en la URL**, no en `useState`.
- Los fixtures e2e siembran eventos **con `user_id`** y **con plan `alta-costura`**.
- Cada suite e2e abre **su propia conexión** a Postgres.
- Comprobación completa antes de cerrar cualquier tarea:
  `pnpm test && pnpm typecheck && pnpm lint && pnpm verify:boundaries && pnpm verify:tenancy`

### Las claves de los dieciséis

| Clave | Diseño | Origen en la maqueta |
|---|---|---|
| `boda-bot` | Marcia & Ricardo · Botánica | `wedding-variants.jsx:6-302` |
| `boda-ed` | María & Alex · Editorial | `wedding-variants.jsx:557-755` |
| `boda-cin` | Sofía & Diego · Cinemática | `wedding-variants.jsx:756-979` |
| `boda` | Camila & Mateo · Étoile | `invites-1.jsx:6-151` |
| `civil` | Lucía & Andrés · Civil | `invites-3.jsx:7-96` |
| `aniv` | Bodas de Oro · 50 años | `invites-3.jsx:97-205` |
| `eng` | Dijo sí · Compromiso | `invites-3.jsx:206-302` |
| `dest` | Alejandra & Pablo · Tulum | `invites-3.jsx:303-410` |
| `xv` | Sofía · Bajo el Mar | `invites-1.jsx:343-587` |
| `xv-natalia` | Natalia · Bajo el Mar | `invites-1.jsx:588-830` |
| `xv-valentina` | Valentina · Mascarada | `invites-1.jsx:1024-1256` |
| `xv-luciana` | Luciana · Bosque Encantado | `invites-1.jsx:1318-1543` |
| `xv-fantasia` | Alicia · Noche Estrellada | `invites-1.jsx:1760-1920` |
| `xv-valeria` | Valeria · Gala Real | `invites-1.jsx:1977-2136` |
| `xv-mariana` | Mariana · Encanto Musical | `invites-1.jsx:2222-2383` |
| `xv-isabelle` | Isabelle · Palacio Griego | `wedding-variants.jsx:303-556` |

---

## Mapa de archivos

**Se crean**

```
src/modules/events/ui/themes/
  contract.ts                     ThemeProps, ThemeDefinition, SectionKey, FontKey
  registry.ts                     (se reescribe) 17 claves con carga perezosa
  kit/
    Reveal.tsx  Countdown.tsx  IntroCover.tsx  PhotoSlot.tsx  PhotoCollage.tsx
    MapPreview.tsx  MusicPlayer.tsx  QrGlyph.tsx  Divider.tsx
    backgrounds/  WeddingMagicBg.tsx  Starfield.tsx  FloatingParticles.tsx
                  BubblesRise.tsx  PremiumBubbles.tsx  MarBackground.tsx
    flora/        RoseCluster.tsx  EucalyptusSpray.tsx  FallingRosePetals.tsx
                  FallingPetals.tsx  RosePetalSVG.tsx  BotanicalTimeline.tsx
                  FloralCorner.tsx  FloralSpray.tsx  FloralDivider.tsx
                  BotanicalWreath.tsx  DividerOrnamental.tsx
    heroes/       HeroRings.tsx  HeroSeal.tsx  HeroAnniversary.tsx  HeroOcean.tsx
    covers/       EnvelopeCover.tsx  SofiaCover.tsx  ValentinaCover.tsx
                  LucianaCover.tsx  FantasiaCover.tsx  ValeriaCover.tsx  MarianaCover.tsx
    ConfettiBurst.tsx  ChromeIcon3D.tsx  Cronograma3DIcon.tsx  time.ts
  bodas/  boda-bot.tsx  boda-ed.tsx  boda-cin.tsx  boda.tsx
          civil.tsx  aniv.tsx  eng.tsx  dest.tsx
  xv/     xv.tsx  xv-natalia.tsx  xv-valentina.tsx  xv-luciana.tsx
          xv-fantasia.tsx  xv-valeria.tsx  xv-mariana.tsx  xv-isabelle.tsx

src/modules/events/domain/invitation-content.ts        parser y tipos de los bloques
src/modules/events/application/content-use-cases.ts    leer, guardar, sembrar
src/modules/events/infrastructure/drizzle-content-repository.ts
src/modules/events/infrastructure/disk-media-storage.ts
src/modules/events/ui/ContentBlockForms.tsx            un formulario por bloque
src/modules/events/ui/ThemePicker.tsx                  rejilla de miniaturas
src/modules/rsvp/ui/use-rsvp.ts                        el hook sin piel
src/app/media/[id]/route.ts                            las imágenes del evento
src/app/(site)/[locale]/modelos/[slug]/page.tsx        vista previa pública
db/migrations/0026_event_content.sql
db/migrations/0027_event_media.sql
db/migrations/0028_templates_theme_key.sql
public/temas/<clave>/…                                 74 imágenes normalizadas
public/fonts/…                                         9 familias nuevas
```

**Se modifican**

```
src/shared/db/schema.ts                    event_content, event_media, templates.theme_key
src/shared/design/fonts.ts                 las 9 familias de los temas
src/shared/i18n/{dictionary,es,en}.ts      los rótulos fijos de los diseños
src/shared/db/seed.ts                      las 16 plantillas reales
src/app/(guest)/i/[token]/page.tsx         ranuras en vez de children
src/app/(guest)/i/[token]/layout.tsx       las fuentes del tema elegido
src/modules/rsvp/ui/RsvpForm.tsx           pasa a usar el hook
src/modules/events/ui/EventForm.tsx        el select pasa a rejilla
src/modules/events/actions.ts              acciones de contenido y de medios
src/app/composition/container.ts           los puertos nuevos
scripts/preflight.ts                       plantilla publicada sin tema registrado
src/app/robots.ts · src/app/sitemap.ts     /modelos/ indexable
scripts/maintenance.ts                     borra contenido e imágenes al vencer
```

---

# Fase 0 — Cimientos

Nada de esta fase pinta un diseño todavía. Es lo que los dieciséis van a compartir, y
hacerlo mal se paga dieciséis veces.

---

### Tarea 1: Las nueve tipografías

Riesgo nº 1 del spec, y por eso va la primera: si la red no da los woff2, hay que saberlo
antes de portar el primer tema, no después de dieciséis.

**Archivos**
- Crear: `public/fonts/*.woff2` (9 familias)
- Modificar: `src/shared/design/fonts.ts`
- Prueba: `src/shared/design/fonts.test.ts`

**Interfaces**
- Produce: `themeFonts: Record<FontKey, NextFontWithVariable>` y
  `FONT_VARIABLES: Record<FontKey, string>`, donde
  `FontKey = 'greatVibes' | 'cinzel' | 'italiana' | 'alexBrush' | 'allura' | 'marcellus' | 'dmSans' | 'newsreader' | 'spectral' | 'cormorant' | 'spaceGrotesk' | 'jetbrainsMono'`.
  Lo consumen la Tarea 3 (`ThemeDefinition.fonts`) y la Tarea 5 (el layout de invitado).

- [ ] **Paso 1: comprobar qué familias faltan**

```bash
ls public/fonts/
```

Esperado: solo `cormorant-garamond-*`, `jost-*`, `space-grotesk-variable`,
`jetbrains-mono-variable`. Faltan nueve.

- [ ] **Paso 2: bajar los woff2**

Para cada familia, pedir la hoja de Google Fonts **con agente de navegador moderno** —sin
él Google devuelve `ttf` en vez de `woff2`— y sacar la URL del `src`:

```bash
cd /Users/miguelangelsaraviabelmonte/dev-web/luxurypremiuminvite-web
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

# Familias de un solo peso (display / manuscritas)
for spec in "Great+Vibes:400:great-vibes" "Alex+Brush:400:alex-brush" \
            "Allura:400:allura" "Italiana:400:italiana" "Marcellus:400:marcellus"; do
  fam=${spec%%:*}; rest=${spec#*:}; wght=${rest%%:*}; out=${rest#*:}
  url=$(curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=${fam}:wght@${wght}&display=swap" \
        | grep -oE 'https://[^)]+\.woff2' | head -1)
  echo "$out <- $url"
  curl -sSL -o "public/fonts/${out}-400.woff2" "$url"
done

# Familias variables (rango de pesos en un solo archivo)
for spec in "Cinzel:400..700:cinzel" "DM+Sans:300..700:dm-sans" \
            "Newsreader:300..500:newsreader" "Spectral:200..400:spectral"; do
  fam=${spec%%:*}; rest=${spec#*:}; rng=${rest%%:*}; out=${rest#*:}
  url=$(curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=${fam}:wght@${rng}&display=swap" \
        | grep -oE 'https://[^)]+\.woff2' | head -1)
  echo "$out <- $url"
  curl -sSL -o "public/fonts/${out}-variable.woff2" "$url"
done
```

Spectral no tiene eje variable en Google: si la URL sale vacía, bajar los pesos sueltos
`200`, `300` y `400` como `spectral-200.woff2`, etc. Lo mismo con Newsreader si falla.

- [ ] **Paso 3: verificar que son woff2 de verdad y no una página de error**

```bash
for f in public/fonts/*.woff2; do printf '%s ' "$f"; head -c4 "$f" | xxd -p; done
```

Esperado: los cuatro primeros bytes de **cada uno** son `774f4632` (`wOF2`). Cualquiera
que dé `3c21444f` (`<!DO`) es un HTML de error: repetir el paso 2 para esa familia.
Ninguno debe pesar menos de 5 KB.

- [ ] **Paso 4: escribir la prueba que falla**

`src/shared/design/fonts.test.ts`:

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FONT_FILES, FONT_VARIABLES } from './fonts'

describe('las tipografías de los temas de invitación', () => {
  it('declara una variable CSS por familia', () => {
    // Doce familias: las tres que ya estaban más las nueve de los diseños.
    expect(Object.keys(FONT_VARIABLES)).toHaveLength(12)
    for (const variable of Object.values(FONT_VARIABLES)) {
      expect(variable).toMatch(/^--font-[a-z-]+$/)
    }
  })

  it('tiene en disco todos los ficheros que declara', () => {
    // Sin esto, `next/font/local` falla en tiempo de compilación y no en la prueba, que
    // es justo cuando cuesta caro descubrirlo.
    for (const archivo of FONT_FILES) {
      expect(existsSync(join(process.cwd(), 'public/fonts', archivo)), archivo).toBe(true)
    }
  })
})
```

- [ ] **Paso 5: verla fallar**

Ejecutar: `pnpm vitest run src/shared/design/fonts.test.ts`
Esperado: FAIL — `FONT_FILES` no existe.

- [ ] **Paso 6: declarar las familias**

Añadir a `src/shared/design/fonts.ts` (sin tocar lo que ya hay):

```ts
/**
 * Las tipografías que piden los dieciséis diseños de invitación.
 *
 * Locales, no enlazadas a Google: una invitación que depende de un tercero para verse
 * bien no se ve bien el día que ese tercero falla, y además le contaría a Google quién
 * abre la invitación de una boda.
 *
 * **Cada tema declara las suyas** en su `ThemeDefinition` y el layout de invitado carga
 * solo esas. Las doce en toda invitación son cientos de kilobytes que ese diseño no
 * pinta.
 *
 * Cada pila de respaldo es real, no `serif` a secas: mientras la fuente carga —o si no
 * carga— lo que se lee tiene que parecerse a lo que el diseño quiso.
 */
export type FontKey =
  | 'cormorant' | 'spaceGrotesk' | 'jetbrainsMono'
  | 'greatVibes' | 'alexBrush' | 'allura' | 'italiana' | 'marcellus'
  | 'cinzel' | 'dmSans' | 'newsreader' | 'spectral'

export const FONT_VARIABLES: Record<FontKey, string> = {
  cormorant: '--font-cormorant',
  spaceGrotesk: '--font-space-grotesk',
  jetbrainsMono: '--font-jetbrains-mono',
  greatVibes: '--font-great-vibes',
  alexBrush: '--font-alex-brush',
  allura: '--font-allura',
  italiana: '--font-italiana',
  marcellus: '--font-marcellus',
  cinzel: '--font-cinzel',
  dmSans: '--font-dm-sans',
  newsreader: '--font-newsreader',
  spectral: '--font-spectral',
}

/** Los nombres de fichero que `themeFonts` carga. La prueba comprueba que están. */
export const FONT_FILES: readonly string[] = [
  'cormorant-garamond-300.woff2', 'cormorant-garamond-400.woff2',
  'cormorant-garamond-500.woff2', 'cormorant-garamond-600.woff2',
  'space-grotesk-variable.woff2', 'jetbrains-mono-variable.woff2',
  'great-vibes-400.woff2', 'alex-brush-400.woff2', 'allura-400.woff2',
  'italiana-400.woff2', 'marcellus-400.woff2',
  'cinzel-variable.woff2', 'dm-sans-variable.woff2',
  'newsreader-variable.woff2', 'spectral-variable.woff2',
]

const FALLBACKS: Record<FontKey, string[]> = {
  cormorant: ['Georgia', 'Times New Roman', 'serif'],
  spaceGrotesk: ['Helvetica Neue', 'Arial', 'sans-serif'],
  jetbrainsMono: ['SFMono-Regular', 'Menlo', 'monospace'],
  greatVibes: ['Snell Roundhand', 'Apple Chancery', 'cursive'],
  alexBrush: ['Snell Roundhand', 'Apple Chancery', 'cursive'],
  allura: ['Snell Roundhand', 'Apple Chancery', 'cursive'],
  italiana: ['Didot', 'Bodoni MT', 'serif'],
  marcellus: ['Palatino', 'Book Antiqua', 'serif'],
  cinzel: ['Optima', 'Palatino', 'serif'],
  dmSans: ['Helvetica Neue', 'Arial', 'sans-serif'],
  newsreader: ['Georgia', 'Times New Roman', 'serif'],
  spectral: ['Georgia', 'Times New Roman', 'serif'],
}

export const greatVibes = localFont({
  variable: FONT_VARIABLES.greatVibes, display: 'swap', fallback: FALLBACKS.greatVibes,
  src: [{ path: '../../../public/fonts/great-vibes-400.woff2', weight: '400', style: 'normal' }],
})
// … una `localFont` por familia, con el mismo patrón. Las variables llevan
// `weight: '300 700'` (Cinzel y DM Sans), `'300 500'` (Newsreader) y `'200 400'` (Spectral).

export const themeFonts = {
  cormorant: display, spaceGrotesk: panelSans, jetbrainsMono: panelMono,
  greatVibes, alexBrush, allura, italiana, marcellus, cinzel, dmSans, newsreader, spectral,
} as const satisfies Record<FontKey, { variable: string }>
```

- [ ] **Paso 7: verla pasar**

Ejecutar: `pnpm vitest run src/shared/design/fonts.test.ts`
Esperado: PASS, los dos casos.

- [ ] **Paso 8: comprobar el peso que esto añade**

```bash
du -ch public/fonts/*.woff2 | tail -1
```

Esperado: por debajo de 900 KB en total. Si una manuscrita pasa de 120 KB, lleva subconjunto
completo: no pasa nada, pero anótalo — se carga solo en los temas que la piden.

- [ ] **Paso 9: comprometer**

```bash
git add public/fonts src/shared/design/fonts.ts src/shared/design/fonts.test.ts
git commit -m "feat: las doce tipografías que piden los diseños de invitación

Nueve nuevas. Locales y no enlazadas a Google: una invitación que
depende de un tercero para verse bien no se ve bien el día que ese
tercero falla, y además le contaría a Google quién abre la invitación de
una boda.

Cada tema declarará las suyas y el layout de invitado cargará solo esas.
Las doce en toda invitación son cientos de kilobytes que ese diseño no
pinta. Las pilas de respaldo son reales, no serif a secas."
```

---

### Tarea 2: Las setenta y cuatro imágenes del diseño

**Archivos**
- Crear: `public/temas/<clave>/*`, `scripts/import-theme-assets.ts`
- Prueba: `src/modules/events/ui/themes/assets.test.ts`

**Interfaces**
- Produce: `themeAsset(key: string, file: string): string` → `/temas/<key>/<file>`.
  Lo consumen las dieciséis tareas de porte.

- [ ] **Paso 1: escribir el guion de importación**

`scripts/import-theme-assets.ts` — copia, normaliza el nombre y **deduplica por
contenido**. La maqueta tiene el mismo archivo dos veces con sufijo de hash
(`MASCARADA MORADA.jpeg` y `MASCARADA MORADA-5c764da1.jpeg`).

```ts
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

const ORIGEN =
  '/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/VallHallaWwepApp'
const DESTINO = 'public/temas'

/**
 * Un espacio o una mayúscula en una ruta servida es un fallo que aparece en producción y
 * no en macOS, donde el sistema de ficheros no distingue mayúsculas. Se normaliza al
 * copiar, una vez, y no se vuelve a pensar en ello.
 */
export function normalizarNombre(original: string): string {
  const ext = extname(original).toLowerCase()
  const base = original.slice(0, -ext.length)
  return (
    base
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // El sufijo de hash de la maqueta (`-5c764da1`) no dice nada del contenido.
      .replace(/-[0-9a-f]{8}$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + (ext === '.jpeg' ? '.jpg' : ext)
  )
}
```

- [ ] **Paso 2: escribir la prueba de la normalización y verla fallar**

`scripts/import-theme-assets.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizarNombre } from './import-theme-assets'

describe('normalizarNombre', () => {
  it('quita espacios y mayúsculas', () => {
    expect(normalizarNombre('BORDE PLATA SF.png')).toBe('borde-plata-sf.png')
  })

  it('quita el sufijo de hash de la maqueta', () => {
    // `MASCARADA MORADA.jpeg` y `MASCARADA MORADA-5c764da1.jpeg` son el mismo archivo.
    expect(normalizarNombre('MASCARADA MORADA-5c764da1.jpeg')).toBe('mascarada-morada.jpg')
    expect(normalizarNombre('MASCARADA MORADA.jpeg')).toBe('mascarada-morada.jpg')
  })

  it('quita las tildes', () => {
    expect(normalizarNombre('Recepción Salón.png')).toBe('recepcion-salon.png')
  })

  it('unifica jpeg y jpg', () => {
    expect(normalizarNombre('bajo el mar1.jpeg')).toBe('bajo-el-mar1.jpg')
  })
})
```

Ejecutar: `pnpm vitest run scripts/import-theme-assets.test.ts`
Esperado: FAIL — el módulo no existe todavía / no exporta.

- [ ] **Paso 3: completar el guion hasta que pase**

Al copiar, comparar el SHA-256 del contenido: si dos originales dan el mismo destino y el
mismo hash, se copia uno y se avisa. Si dan el mismo destino y **distinto** hash, **para
con error**: son dos imágenes distintas que se pisarían, y hay que desambiguar a mano.

- [ ] **Paso 4: ejecutarlo**

```bash
pnpm tsx scripts/import-theme-assets.ts
find public/temas -type f | wc -l
```

Esperado: 74 archivos o menos (menos, por los duplicados), repartidos en 16 carpetas.
Cero errores de colisión.

- [ ] **Paso 5: comprobar que ninguna quedó rota**

```bash
find public/temas -type f -size -1k
```

Esperado: **ninguna salida**. Un archivo de menos de 1 KB es una copia fallida.

- [ ] **Paso 6: mirarlas**

Abrir `public/temas/` en el Finder y pasar por las 74. Es el paso que no se puede
automatizar: una imagen que es de otra persona, o un marcador de la maqueta colado como
si fuera arte final, solo se ve mirando. Cualquiera que no sea del usuario se anota y se
sustituye por un marcador antes de publicar (riesgo nº 2 del spec).

- [ ] **Paso 7: el ayudante de rutas, con su prueba**

`src/modules/events/ui/themes/assets.ts`:

```ts
/**
 * La ruta pública de una imagen del tema. Son *el aspecto* del tema, como un SVG del
 * kit: van versionadas en el repositorio, no en el almacén de medios del evento.
 */
export const themeAsset = (key: string, file: string): string => `/temas/${key}/${file}`
```

- [ ] **Paso 8: comprometer**

```bash
git add public/temas scripts/import-theme-assets.ts scripts/import-theme-assets.test.ts \
        src/modules/events/ui/themes/assets.ts
git commit -m "feat: las imágenes de los dieciséis diseños, con el nombre normalizado

Un espacio o una mayúscula en una ruta servida es un fallo que aparece
en producción y no en macOS. Se normaliza al copiar, una vez.

La maqueta trae el mismo archivo dos veces con sufijo de hash: se
deduplica por contenido, y si dos originales distintos caen en el mismo
destino el guion para en vez de pisar uno."
```

---

### Tarea 3: El contrato y el registro

**Archivos**
- Crear: `src/modules/events/ui/themes/contract.ts`
- Modificar: `src/modules/events/ui/themes/registry.ts`
- Prueba: `src/modules/events/ui/themes/registry.test.ts` (ya existe; se amplía)

**Interfaces**
- Consume: `FontKey` (Tarea 1).
- Produce: `ThemeProps`, `ThemeDefinition`, `SectionKey`, `themeFor(key)`,
  `THEME_KEYS`, `themeDefinitions()`. Lo consumen todas las tareas siguientes.

- [ ] **Paso 1: escribir la prueba que falla**

Añadir a `src/modules/events/ui/themes/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { THEME_KEYS, themeDefinitions, themeFor } from './registry'

const LOS_DIECISEIS = [
  'boda-bot', 'boda-ed', 'boda-cin', 'boda', 'civil', 'aniv', 'eng', 'dest',
  'xv', 'xv-natalia', 'xv-valentina', 'xv-luciana',
  'xv-fantasia', 'xv-valeria', 'xv-mariana', 'xv-isabelle',
] as const

describe('el registro de temas', () => {
  it('tiene el clásico y los dieciséis', () => {
    expect(THEME_KEYS).toHaveLength(17)
    for (const clave of LOS_DIECISEIS) expect(THEME_KEYS).toContain(clave)
  })

  it('resuelve cada clave a su propia definición', () => {
    for (const clave of LOS_DIECISEIS) expect(themeFor(clave).key).toBe(clave)
  })

  it('cae al clásico con una clave desconocida', () => {
    // `theme_key` en la base es solo texto. Una invitación en blanco el día de la boda es
    // peor que una invitación sobria.
    expect(themeFor('lo-que-sea').key).toBe('clasico')
  })

  it('cada definición declara al menos una tipografía y una sección', () => {
    // Una definición sin tipografías carga la pila de respaldo del sistema y el diseño
    // pierde el carácter entero; una sin secciones deja al panel sin nada que pedir.
    for (const definicion of themeDefinitions()) {
      expect(definicion.fonts.length, definicion.key).toBeGreaterThan(0)
      expect(definicion.sections.length, definicion.key).toBeGreaterThan(0)
    }
  })

  it('todos los temas pintan hero, schedule, reception y closing', () => {
    for (const definicion of themeDefinitions()) {
      if (definicion.key === 'clasico') continue
      for (const seccion of ['hero', 'schedule', 'reception', 'closing'] as const) {
        expect(definicion.sections, definicion.key).toContain(seccion)
      }
    }
  })

  it('siembra contenido para cada sección que declara pintar', () => {
    // Un tema que dice pintar el itinerario y no trae uno de muestra enseña un hueco en
    // el escaparate, que es exactamente lo que el cliente viene a mirar.
    for (const definicion of themeDefinitions()) {
      if (definicion.key === 'clasico') continue
      for (const seccion of definicion.sections) {
        expect(definicion.defaultContent[seccion], `${definicion.key}/${seccion}`).toBeDefined()
      }
    }
  })

  it('la categoría de cada tema existe en el catálogo', () => {
    for (const definicion of themeDefinitions()) {
      if (definicion.key === 'clasico') continue
      expect(['boda', 'boda-civil', 'xv-anos']).toContain(definicion.categorySlug)
    }
  })
})
```

- [ ] **Paso 2: verla fallar**

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/registry.test.ts`
Esperado: FAIL — `themeDefinitions` no existe y `THEME_KEYS` tiene 1.

- [ ] **Paso 3: escribir el contrato**

`src/modules/events/ui/themes/contract.ts`:

```ts
import type { ComponentType, ReactNode } from 'react'
import type { FontKey } from '@/shared/design/fonts'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import type { Event } from '../../domain/event'
import type { InvitationContent } from '../../domain/invitation-content'

/** Los bloques de contenido que un diseño puede pintar. */
export type SectionKey =
  | 'hero' | 'quote' | 'hosts' | 'schedule' | 'ceremony' | 'reception'
  | 'map' | 'itinerary' | 'dressCode' | 'music' | 'gallery' | 'closing'

/**
 * Las ranuras, en vez de un `children` único.
 *
 * Estos diseños **intercalan**: el RSVP va a dos tercios del scroll, entre el código de
 * vestimenta y la despedida, y el libro de firmas después del cierre. Un `children` solo
 * puede ir en un sitio, y hasta ahora iba al final porque el único tema lo ponía ahí.
 *
 * Lo que entra por estas ranuras es **lo nuestro**: el RSVP que escribe en la base, la
 * mesa de regalos que reserva de verdad y el libro de firmas que guarda el mensaje. Los
 * de la maqueta solo hacían `useState`.
 */
export type ThemeSlots = {
  readonly rsvp: ReactNode
  readonly registry: ReactNode
  readonly guestbook: ReactNode
  readonly pass: ReactNode
}

export type ThemeProps = {
  readonly event: Event
  readonly content: InvitationContent
  readonly dictionary: InvitationDictionary
  readonly slots: ThemeSlots
}

/**
 * Un tema no es solo un componente.
 *
 * `fonts` es lo que el layout de invitado consulta para no bajar doce familias cuando el
 * diseño usa cinco. `sections` es lo que el panel consulta para no pedirle un itinerario
 * a un diseño que no lo pinta. `palette` es **el único sitio** donde viven los
 * hexadecimales de este diseño: el kit los recibe por prop y no tiene ninguno propio.
 */
export type ThemeDefinition = {
  readonly key: string
  readonly label: string
  readonly categorySlug: 'boda' | 'boda-civil' | 'xv-anos'
  readonly palette: Readonly<Record<string, string>>
  readonly fonts: readonly FontKey[]
  readonly sections: readonly SectionKey[]
  readonly defaultContent: InvitationContent
  readonly Component: ComponentType<ThemeProps>
}
```

- [ ] **Paso 4: reescribir el registro con carga perezosa**

`src/modules/events/ui/themes/registry.ts`:

```ts
import dynamic from 'next/dynamic'
import type { ThemeDefinition } from './contract'
import { clasicoTheme } from './ClasicoTheme'
import { bodaBotDefinition } from './bodas/boda-bot'
// … una importación por tema. Cada archivo exporta su definición **sin** el componente
// pesado; el componente entra por `dynamic`, así que la definición se puede leer en el
// servidor sin arrastrar el diseño entero al paquete.

const THEMES = {
  clasico: clasicoTheme,
  'boda-bot': bodaBotDefinition,
  // … los dieciséis
} as const satisfies Record<string, ThemeDefinition>

export const THEME_KEYS: readonly string[] = Object.keys(THEMES)

export const themeDefinitions = (): readonly ThemeDefinition[] => Object.values(THEMES)

/**
 * Una clave que el registro no conoce cae al clásico, y sigue siendo a propósito:
 * `theme_key` en la base es solo texto, así que una clave borrada de aquí dejaría la
 * invitación en blanco el día de la boda.
 */
export const themeFor = (key: string): ThemeDefinition =>
  (THEMES as Record<string, ThemeDefinition>)[key] ?? THEMES.clasico
```

Cada archivo de tema arma su definición así, para que el diseño entre por `dynamic`:

```ts
// src/modules/events/ui/themes/bodas/boda-bot.tsx
export const bodaBotDefinition: ThemeDefinition = {
  key: 'boda-bot',
  label: 'Botánica',
  categorySlug: 'boda',
  palette: PALETA,
  fonts: ['greatVibes', 'cinzel', 'italiana', 'cormorant', 'jetbrainsMono', 'spaceGrotesk'],
  sections: ['hero', 'quote', 'schedule', 'ceremony', 'reception', 'map',
             'itinerary', 'music', 'gallery', 'closing'],
  defaultContent: CONTENIDO_DE_MUESTRA,
  Component: dynamic(() => import('./boda-bot.view').then((m) => m.BodaBotView)),
}
```

- [ ] **Paso 5: verla pasar (con un tema de mentira)**

Para cerrar esta tarea sin haber portado nada, registrar los dieciséis apuntando **todos**
a un componente provisional `PendienteView` que pinta el título y una nota de «tema en
construcción», y con `defaultContent`, `fonts` y `sections` ya **reales** —esos sí se
rellenan ahora, leyendo cada diseño—. Cada tarea de porte cambia una sola línea: el
`Component`.

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/registry.test.ts`
Esperado: PASS, los siete casos.

- [ ] **Paso 6: comprobación completa y comprometer**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm verify:boundaries
git add src/modules/events/ui/themes
git commit -m "feat: el contrato y el registro de los diecisiete temas

Un tema deja de ser solo un componente: declara sus tipografías —para
que el layout no baje doce familias cuando el diseño usa cinco—, sus
secciones —para que el panel no pida un itinerario a quien no lo pinta—
y su paleta, que es el único sitio donde viven sus hexadecimales.

Ranuras en vez de children: estos diseños meten el RSVP a dos tercios
del scroll y el libro de firmas después del cierre, y un children solo
puede ir en un sitio.

Los dieciséis quedan registrados apuntando a un componente provisional.
Cada tarea de porte cambia una línea."
```

---

### Tarea 4: El núcleo del kit — tiempo, `Reveal` y `Countdown`

Las tres piezas que usan **los dieciséis**. Aquí es donde se fija la regla de movimiento
reducido, y hacerla mal se paga dieciséis veces.

**Archivos**
- Crear: `src/modules/events/ui/themes/kit/time.ts`, `kit/Reveal.tsx`, `kit/Countdown.tsx`
- Prueba: `kit/time.test.ts`, `kit/Reveal.test.tsx`, `kit/Countdown.test.tsx`

**Interfaces**
- Produce: `pad(n, ancho?)`, `countdownFrom(targetISO, now)` →
  `{ days, hours, mins, secs, over }`; `<Reveal delay? y? scale? duration?>`;
  `<Countdown targetISO labels palette />`.

- [ ] **Paso 1: la prueba del cálculo, que no toca el reloj**

`kit/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { countdownFrom, pad } from './time'

describe('pad', () => {
  it('rellena a dos cifras', () => {
    expect(pad(7)).toBe('07')
    expect(pad(42)).toBe('42')
  })
})

describe('countdownFrom', () => {
  // Recibe el instante como argumento y no llama al reloj, igual que `dueReminders`
  // recibe el día y `autoAssign` no llama a Math.random. Así la víspera se prueba sin
  // tocar el reloj del sistema.
  const ahora = new Date('2026-09-10T12:00:00Z')

  it('reparte el tiempo que falta', () => {
    expect(countdownFrom('2026-09-12T19:00:00Z', ahora)).toEqual({
      days: 2, hours: 7, mins: 0, secs: 0, over: false,
    })
  })

  it('devuelve todo a cero cuando la fecha ya pasó', () => {
    // Nunca cifras negativas: una invitación que dice «faltan -3 días» está rota a la
    // vista de todo el que la abra después de la boda, que son muchos.
    expect(countdownFrom('2026-09-01T00:00:00Z', ahora)).toEqual({
      days: 0, hours: 0, mins: 0, secs: 0, over: true,
    })
  })

  it('trata una fecha ilegible como pasada, sin reventar', () => {
    expect(countdownFrom('no es una fecha', ahora).over).toBe(true)
  })
})
```

- [ ] **Paso 2: verla fallar**

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/kit/time.test.ts`
Esperado: FAIL — el módulo no existe.

- [ ] **Paso 3: escribir `time.ts`**

```ts
export type CountdownParts = {
  readonly days: number; readonly hours: number
  readonly mins: number; readonly secs: number; readonly over: boolean
}

const CERO: CountdownParts = { days: 0, hours: 0, mins: 0, secs: 0, over: true }

export const pad = (n: number, ancho = 2): string => String(n).padStart(ancho, '0')

/**
 * El tiempo que falta, recibiendo el instante como argumento.
 *
 * No llama al reloj a propósito, igual que `dueReminders` recibe el día: así la víspera
 * se prueba sin tocar el reloj del sistema. Quien anima es `<Countdown>`.
 */
export function countdownFrom(targetISO: string, now: Date): CountdownParts {
  const objetivo = new Date(targetISO).getTime()
  if (Number.isNaN(objetivo)) return CERO
  const restante = objetivo - now.getTime()
  if (restante <= 0) return CERO
  const total = Math.floor(restante / 1000)
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    mins: Math.floor((total % 3_600) / 60),
    secs: total % 60,
    over: false,
  }
}
```

- [ ] **Paso 4: verla pasar**

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/kit/time.test.ts`
Esperado: PASS, los cuatro casos.

- [ ] **Paso 5: la prueba de `Reveal`, que es la que importa**

`kit/Reveal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'

function conMovimientoReducido(reducido: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: reducido && consulta.includes('prefers-reduced-motion'),
    media: consulta, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
  }))
}

beforeEach(() => {
  // jsdom no trae IntersectionObserver. Sin este doble, `Reveal` no monta y la prueba
  // pasaría por el motivo equivocado.
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn()
    constructor(_cb: unknown) {}
  })
})

describe('Reveal', () => {
  it('con movimiento reducido deja el contenido visible desde el primer momento', () => {
    // Esta es LA prueba de esta pieza. Un Reveal que arranca en opacity 0 y espera un
    // observador que nunca dispara deja la invitación entera en blanco para quien pidió
    // menos movimiento. La usan los dieciséis diseños.
    conMovimientoReducido(true)
    render(<Reveal><p>Camila & Mateo</p></Reveal>)
    const nodo = screen.getByText('Camila & Mateo').parentElement
    expect(nodo).toHaveStyle({ opacity: '1' })
    expect(nodo?.style.transform === '' || nodo?.style.transform === 'none').toBe(true)
  })

  it('sin movimiento reducido arranca oculto y desplazado', () => {
    conMovimientoReducido(false)
    render(<Reveal y={32}><p>Camila & Mateo</p></Reveal>)
    const nodo = screen.getByText('Camila & Mateo').parentElement
    expect(nodo).toHaveStyle({ opacity: '0' })
    expect(nodo?.style.transform).toContain('32px')
  })

  it('pinta el contenido en el marcado en los dos casos', () => {
    // Aunque no se vea todavía, tiene que estar: es lo que leen los buscadores y los
    // lectores de pantalla.
    conMovimientoReducido(false)
    render(<Reveal><p>Camila & Mateo</p></Reveal>)
    expect(screen.getByText('Camila & Mateo')).toBeInTheDocument()
  })
})
```

- [ ] **Paso 6: verla fallar, luego escribir `Reveal` y `Countdown`**

`Reveal` lleva `'use client'`, lee `matchMedia('(prefers-reduced-motion: reduce)')` en el
primer render con `useState(() => …)` —no en un `useEffect`, que pintaría un fotograma
oculto antes de corregirse—, y con movimiento reducido **no monta el observador**.

`Countdown` llama a `countdownFrom` con `new Date()` en un `useEffect` con intervalo de un
segundo, y **con movimiento reducido no anima el número**: sigue actualizándose, porque un
contador congelado miente, pero sin transición.

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/kit/`
Esperado: PASS.

- [ ] **Paso 7: comprometer**

```bash
git add src/modules/events/ui/themes/kit
git commit -m "feat: el núcleo del kit de temas — tiempo, Reveal y Countdown

countdownFrom recibe el instante y no llama al reloj, igual que
dueReminders recibe el día: la víspera se prueba sin tocar el reloj del
sistema. Nunca cifras negativas — una invitación que dice «faltan -3
días» está rota para todo el que la abra después de la boda.

Reveal decide el movimiento reducido en el primer render, no en un
efecto que pintaría un fotograma oculto antes de corregirse. Con
movimiento reducido no monta el observador y el contenido queda visible:
un Reveal que espera un observador que nunca dispara deja la invitación
en blanco, y lo usan los dieciséis."
```

---

### Tarea 5: El resto del kit — fondos, flora, héroes y portadas

Los otros 43 auxiliares. Se portan **una vez** y los dieciséis los heredan.

**Archivos**
- Crear: los de `kit/backgrounds/`, `kit/flora/`, `kit/heroes/`, `kit/covers/`, más
  `kit/PhotoSlot.tsx`, `kit/PhotoCollage.tsx`, `kit/MapPreview.tsx`,
  `kit/MusicPlayer.tsx`, `kit/QrGlyph.tsx`, `kit/Divider.tsx`,
  `kit/ConfettiBurst.tsx`, `kit/ChromeIcon3D.tsx`, `kit/Cronograma3DIcon.tsx`
- Prueba: `kit/kit.test.tsx`, `kit/no-hex.test.ts`

**Origen exacto en la maqueta**

| Destino | Origen |
|---|---|
| `PhotoSlot`, `PhotoCollage`, `QrGlyph`, `MapPreview`, `MusicPlayer`, `Divider`, `ConfettiBurst` | `utils.jsx:75,94,152,502,528,583,410` |
| `Starfield`, `FloatingParticles`, `BubblesRise`, `PremiumBubbles`, `MarBackground` | `utils.jsx:195,220,244,267,5` |
| `EnvelopeCover`, `SofiaCover` | `utils.jsx:308,361` |
| `ValentinaCover`, `LucianaCover`, `FantasiaCover`, `ValeriaCover`, `MarianaCover` | `invites-1.jsx:831,1296,1702,1921,2137` |
| `BotanicalWreath`, `DividerOrnamental`, `ChromeIcon3D` | `invites-1.jsx:866,998,2192` |
| `RoseCluster`, `EucalyptusSpray`, `FallingPetals`, `BotanicalTimeline`, `FallingRosePetals`, `RosePetalSVG`, `WeddingMagicBg` | `wedding-flora.jsx:7,124,148,269,307,359,430` |
| `FloralCorner`, `FloralSpray`, `FloralDivider` | `flora-art.jsx:15,35,51` |
| `HeroRings`, `HeroSeal`, `HeroAnniversary`, `HeroOcean` | `hero-animations.jsx:7,58,95,127` |
| `Cronograma3DIcon` | `wedding-variants.jsx` |
| Los `@keyframes` que usan | `Catalogo.html:13-140` |

Los `@keyframes` van a **una hoja propia del kit** —`kit/keyframes.css`, importada solo
por el layout de invitado—, no a `tokens.css`: son animación de estos diseños y no
tokens de marca.

**Interfaces**
- Consume: `Reveal`, `pad`, `countdownFrom` (Tarea 4); `themeAsset` (Tarea 2).
- Produce: los 43 componentes. **Todos** reciben color por prop, con `Props` tipadas.

- [ ] **Paso 1: escribir primero la prueba que hace de guardia**

`kit/no-hex.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function archivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivosDe(ruta)
    return /\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

describe('el kit de temas', () => {
  it('no lleva ni un color hexadecimal', () => {
    // El kit es de los dieciséis a la vez. Un #d4b483 dentro de MapPreview reaparecería
    // en la boda botánica, que es verde, y en el bosque encantado, que también.
    // Los hexadecimales de un diseño viven en la `palette` de su ThemeDefinition y
    // llegan aquí por prop, siempre.
    const raiz = join(process.cwd(), 'src/modules/events/ui/themes/kit')
    const culpables = archivosDe(raiz).filter((ruta) =>
      /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(ruta, 'utf8')),
    )
    expect(culpables).toEqual([])
  })
})
```

- [ ] **Paso 2: verla pasar en vacío, y comprobar que sirve**

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/kit/no-hex.test.ts`
Esperado: PASS (el directorio está casi vacío).

Comprobar que la guardia **funciona**: meter a mano `const x = '#d4b483'` en
`kit/time.ts`, correr la prueba, ver que **falla**, y quitarlo. Una guardia que nunca se
ha visto fallar no es una guardia. Es la misma comprobación que hizo
`verify:boundaries`.

- [ ] **Paso 3: portar en cuatro tandas, corriendo la guardia entre cada una**

En este orden, porque cada tanda depende de la anterior:

1. `PhotoSlot`, `PhotoCollage`, `Divider`, `QrGlyph`, `ConfettiBurst`
2. `MapPreview`, `MusicPlayer`, `ChromeIcon3D`, `Cronograma3DIcon`
3. `backgrounds/` los cinco, y `flora/` los once
4. `heroes/` los cuatro y `covers/` los siete

Reglas del porte, iguales para los 43:

- **El marcado no se toca.** Mismos `viewBox`, mismos `d` de cada `path`, mismos tiempos y
  retardos de animación, mismo orden de capas. Lo que se toca es el tipado y el color por
  prop.
- Todo color literal del original pasa a **prop obligatoria**. Si el original traía un
  valor por defecto (`accent = "#d4b483"`), el defecto **se elimina**: quien lo pinte
  declara su color. Un defecto es un hexadecimal escondido.
- Lo que anima lleva `'use client'`. Lo que es SVG estático se queda en el servidor.
- Todo lo que anima respeta `prefers-reduced-motion`. Los fondos de partículas
  —`Starfield`, `FloatingParticles`, `BubblesRise`, `PremiumBubbles`,
  `FallingRosePetals`, `FallingPetals`— con movimiento reducido **no se pintan en
  absoluto**: son decoración pura y su estado quieto no aporta nada.
- `PhotoSlot` recibe `src` opcional. Sin `src` pinta el marcador del original —es lo que
  ve el escaparate y el evento que aún no ha subido su foto—; con `src`, la imagen.
- Ninguna imagen del kit se referencia con ruta literal: siempre `themeAsset(clave, archivo)`.

- [ ] **Paso 4: la prueba de las piezas animadas**

`kit/kit.test.tsx` — para **cada** pieza que anima, un caso: con
`prefers-reduced-motion: reduce`, o no se pinta (fondos de partículas) o queda en su
estado final visible (el resto). Reusar el ayudante `conMovimientoReducido` de la Tarea 4,
extraído a `kit/test-helpers.ts`.

Ejecutar: `pnpm vitest run src/modules/events/ui/themes/kit/`
Esperado: PASS.

- [ ] **Paso 5: comprobación completa y comprometer**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm verify:boundaries
git add src/modules/events/ui/themes/kit
git commit -m "feat: los cuarenta y tres auxiliares del kit de temas

Portados una vez y no dieciséis: un fallo en Reveal se arregla en un
sitio. El marcado no se toca —mismos viewBox, mismos path, mismos
tiempos—; lo que cambia es el tipado y que todo color entra por prop.

Los valores por defecto de color se eliminan a propósito: un defecto es
un hexadecimal escondido, y este kit lo comparten un bosque verde y una
mascarada morada. Hay una prueba que falla si aparece uno, y se comprobó
que falla."
```

---

### Tarea 6: El RSVP, la mesa y el libro sin piel, y las ranuras

Aquí la fidelidad choca de frente con lo que hay. `RsvpForm` tiene las clases de la
paleta marfil clavadas —`bg-bg-top/80`, `--color-line`, `bg-gold`—: dentro de la
mascarada morada es una mancha de la web pública. Y no es solo color: la maqueta trae
**seis formularios distintos**, uno por diseño.

**Archivos**
- Crear: `src/modules/rsvp/ui/use-rsvp.ts`,
  `src/modules/registry/ui/use-gift-claim.ts`, `src/modules/guestbook/ui/use-guest-reply.ts`
- Modificar: `src/modules/rsvp/ui/RsvpForm.tsx`, `src/modules/rsvp/index.ts`,
  `src/modules/registry/ui/GuestRegistry.tsx`, `src/modules/guestbook/ui/GuestReply.tsx`,
  `src/app/(guest)/i/[token]/page.tsx`, `src/app/(guest)/i/[token]/layout.tsx`
- Prueba: `use-rsvp.test.tsx`, `use-gift-claim.test.tsx`, `use-guest-reply.test.tsx`

**Interfaces**
- Produce: `useRsvp({ token, seats, previous })` →
  `{ state, formAction, isPending, error, acknowledged, acknowledge }`;
  `useGiftClaim({ token, groupId })` → `{ claim, release, pending, error }`;
  `useGuestReply({ token })` → `{ reply }`.
  Los consumen los temas que pintan su propio formulario.

**Los tres, no solo el RSVP.** La mesa de regalos y el libro de firmas tienen el mismo
problema y la misma cura: la lógica en un hook, la piel la pone el tema. Si se deja para
después, los seis temas de XV de la tanda D se escriben contra una mesa de regalos con la
paleta marfil dentro y hay que volver a pasar por los seis.

- [ ] **Paso 1: la prueba del hook**

Comprobar que `useRsvp` **no** trae marcado ni clases —es solo estado— y que expone el
error ya resuelto contra el diccionario. La Server Action `respondAction` **no se toca**:
sigue con su candado de contraseña y su validación de cupos.

- [ ] **Paso 2: verla fallar, extraer los tres hooks, y dejar las vistas usándolos**

`RsvpForm`, `GuestRegistry` y `GuestReply` no cambian de aspecto ni de comportamiento:
siguen siendo lo que pinta `clasico`. Solo mueven su estado al hook. Las pruebas que ya
tienen tienen que seguir pasando **sin tocarlas** — si hay que tocarlas, es que cambió el
comportamiento, y entonces no es una extracción.

Las acciones de servidor **no se tocan**: `respondAction`, `claimGiftAction` y las del
libro siguen con su candado de contraseña —`eventUnlocked`— y su autorización por token.
Ese candado cierra las escrituras, no solo el render, y esta tarea no puede aflojarlo.

- [ ] **Paso 3: las ranuras en la página del invitado**

En `src/app/(guest)/i/[token]/page.tsx`, sustituir el envoltorio actual por:

```tsx
const definicion = themeFor(event.themeKey)
const { Component: Theme } = definicion
const contenido = await eventos.contentFor(event.id, definicion)

return (
  <Theme
    content={contenido}
    dictionary={dictionary}
    event={event}
    slots={{
      rsvp: abierto
        ? <RsvpForm dictionary={dictionary} previous={latest} seats={group.seats} token={token} />
        : <p className="text-[14px] leading-[1.7]">{dictionary.closed}</p>,
      registry: isErr(mesa) ? null : <GuestRegistry {...} />,
      guestbook: <GuestReply {...} />,
      pass: <PassQr {...} />,
    }}
  />
)
```

`ViewBeacon` se queda **fuera** del tema: cuenta la visita y no pinta nada, y un tema no
tiene por qué saber que existe.

- [ ] **Paso 4: las fuentes del tema en el layout de invitado**

`layout.tsx` lee `themeFor(event.themeKey).fonts` y compone la `className` con solo esas
variables. Ojo: el layout resuelve el evento **por el token**, igual que la página; no
puede leer `params` de otra cosa.

- [ ] **Paso 5: comprobar que el clásico sigue igual**

```bash
pnpm test && pnpm typecheck && pnpm lint
pnpm test:e2e --grep "invitación"
```

Esperado: verde. Esta tarea **no cambia nada de lo que se ve** — es andamiaje. Si una e2e
de invitación falla aquí, es un fallo de verdad, no un ajuste de expectativa.

- [ ] **Paso 6: comprometer**

```bash
git add src/modules/rsvp src/app/\(guest\)
git commit -m "refactor: RSVP, mesa y libro sin piel, y ranuras en la invitación

Las tres vistas tenían la paleta marfil clavada en las clases; dentro de
la mascarada morada son una mancha de la web pública. Y la maqueta trae
seis formularios distintos, uno por diseño: el color no era el problema.

Los hooks se quedan con el estado y cada tema pinta lo suyo. Las Server
Actions no se tocan — siguen con su candado de contraseña, que cierra
las escrituras y no solo el render.

Andamiaje puro: el clásico se ve exactamente igual."
```

---

# Fase 1 — El contenido del evento

---

### Tarea 7: `event_content` — migración, esquema y dominio

**Archivos**
- Crear: `db/migrations/0026_event_content.sql`,
  `src/modules/events/domain/invitation-content.ts`
- Modificar: `src/shared/db/schema.ts`, `db/migrations/meta/_journal.json`
- Prueba: `src/modules/events/domain/invitation-content.test.ts`,
  `src/shared/db/migrations-journal.test.ts` (ya vigila el alta)

**Interfaces**
- Produce: `InvitationContent` (todos los bloques opcionales),
  `parseInvitationContent(raw: unknown): InvitationContent`,
  `mergeContent(base, encima): InvitationContent`.

- [ ] **Paso 1: la migración**

```sql
-- El contenido rico de la invitación: lo que los dieciséis diseños pintan y `events` no
-- guarda —ceremonia y recepción por separado, itinerario, galería, código de vestimenta—.
--
-- Un solo `jsonb` y no diecinueve columnas: se lee entero y se edita entero, y tres de
-- los bloques son listas. La base garantiza que es JSON; que sea *este* JSON lo garantiza
-- el dominio al leerlo y al escribirlo.
--
-- `cascade` porque el contenido no significa nada sin su evento, igual que `event_staff`.
-- Lo que nunca cae en cascada son los datos con valor propio.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists event_content (
  event_id uuid primary key references events(id) on delete cascade,
  blocks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Alta en `_journal.json` con `idx: 26` **en el mismo commit**. El registro se quedó una vez
en `0007` mientras se escribían nueve migraciones y `db:migrate` ni las miraba: en
desarrollo no se notaba, pero una base nueva arrancaba sin la mitad del esquema.

- [ ] **Paso 2: la prueba del parser**

Casos que tienen que estar:

```ts
it('acepta un objeto vacío', () => {
  expect(parseInvitationContent({})).toEqual({})
})

it('no revienta con basura dentro', () => {
  // Es un jsonb: alguien puede haber escrito cualquier cosa por SQL. Una invitación que
  // revienta entera porque un bloque está mal es peor que una invitación sin ese bloque.
  expect(parseInvitationContent({ itinerary: 'no es una lista' })).toEqual({})
  expect(parseInvitationContent(null)).toEqual({})
  expect(parseInvitationContent('texto')).toEqual({})
})

it('descarta las filas mal formadas de una lista y conserva las buenas', () => {
  const salida = parseInvitationContent({
    itinerary: [{ time: '18:00', label: 'Recepción' }, { label: 'sin hora' }, 42],
  })
  expect(salida.itinerary).toEqual([{ time: '18:00', label: 'Recepción' }])
})

it('corta la galería en seis', () => {
  const doce = Array.from({ length: 12 }, (_, i) => ({ imageId: `id-${i}`, label: `${i}` }))
  expect(parseInvitationContent({ gallery: doce }).gallery).toHaveLength(6)
})

it('recorta los espacios y descarta lo que queda vacío', () => {
  expect(parseInvitationContent({ quote: { text: '   ' } }).quote).toBeUndefined()
})
```

Y para `mergeContent`, **la prueba que protege una boda de verdad**:

```ts
it('rellena lo vacío y no pisa lo escrito', () => {
  const delDiseno = { quote: { text: 'De muestra' }, music: { track: 'At Last', artist: 'Etta James' } }
  const delAtelier = { music: { track: 'Perfect', artist: 'Ed Sheeran' } }
  expect(mergeContent(delDiseno, delAtelier)).toEqual({
    quote: { text: 'De muestra' },
    music: { track: 'Perfect', artist: 'Ed Sheeran' },
  })
})

it('un bloque escrito a medias no se completa con el del diseño', () => {
  // Media ficha es peor que ninguna: mezclar la canción del atelier con el artista de la
  // maqueta produce una línea que nadie escribió. El bloque es la unidad.
  const fusion = mergeContent(
    { music: { track: 'At Last', artist: 'Etta James' } },
    { music: { track: 'Perfect', artist: '' } },
  )
  expect(fusion.music).toEqual({ track: 'Perfect', artist: '' })
})
```

- [ ] **Paso 3: verla fallar, escribir el dominio, verla pasar**

`invitation-content.ts` es **puro**: sin `import` de `infrastructure`, sin Drizzle, sin
`Date.now`. Es lo que `verify:boundaries` comprueba.

- [ ] **Paso 4: comprometer**

```bash
git add db/migrations src/shared/db/schema.ts src/modules/events/domain
git commit -m "feat: event_content, el contenido rico de la invitación

Un jsonb y no diecinueve columnas: se lee entero, se edita entero y tres
bloques son listas. La base garantiza que es JSON; que sea este JSON lo
garantiza el dominio.

El parser no revienta con basura dentro: descarta la fila mal formada y
conserva las buenas. Una invitación que revienta entera porque un bloque
está mal es peor que una invitación sin ese bloque.

mergeContent rellena lo vacío y no pisa lo escrito, y el bloque es la
unidad: mezclar la canción del atelier con el artista de la maqueta
produce una línea que no escribió nadie."
```

---

### Tarea 8: Repositorio, casos de uso y sembrado

**Archivos**
- Crear: `src/modules/events/infrastructure/drizzle-content-repository.ts`,
  `src/modules/events/application/content-use-cases.ts`
- Modificar: `src/modules/events/application/ports.ts`,
  `src/app/composition/container.ts`, `src/modules/events/index.ts`
- Prueba: `drizzle-content-repository.test.ts` (contra Postgres real),
  `content-use-cases.test.ts` (con doble)

**Interfaces**
- Produce: `contentFor(eventId, definicion)` —lee, y **siembra al vuelo** lo que falte sin
  escribir—; `saveContentBlock(eventId, seccion, valor)`;
  `seedContentForTheme(eventId, definicion)` —escribe, al crear el evento o al cambiar de
  tema—.

- [ ] **Paso 1: las pruebas contra Postgres real**

Tres, y las tres tienen que estar:

```ts
it('cae en cascada al borrar el evento', async () => { … })
it('admite un solo contenido por evento', async () => { … })  // la clave primaria
it('guarda y devuelve un bloque con acentos y saltos de línea', async () => { … })
```

- [ ] **Paso 2: la prueba del sembrado**

```ts
it('al cambiar de tema no borra lo que el atelier escribió', async () => {
  // Perder el itinerario de una boda por probar otro diseño sería la peor forma posible
  // de descubrir esta regla.
})
```

- [ ] **Paso 3: escribir, verlas pasar, comprometer**

`contentFor` **no escribe**. Lee lo guardado y lo fusiona con el `defaultContent` del tema
para pintar. Solo `seedContentForTheme` escribe, y solo cuando el atelier crea el evento o
cambia de tema. Así una invitación abierta mil veces no hace mil escrituras.

---

# Fase 2 — Las imágenes del evento

---

### Tarea 9: `event_media` — almacén y migración

**Archivos**
- Crear: `db/migrations/0027_event_media.sql`,
  `src/modules/events/infrastructure/disk-media-storage.ts`
- Modificar: `src/shared/db/schema.ts`, `_journal.json`, `src/shared/config/env.ts`
- Prueba: `disk-media-storage.test.ts`

De `src/modules/orders/infrastructure/disk-file-storage.ts` se hereda **entero** el
patrón, incluida la comprobación de clave que no debería dispararse nunca y está por lo
que costaría que se disparase.

- [ ] **Paso 1: la prueba de la firma por bytes**

```ts
it('decide el tipo por los primeros bytes, no por la extensión', () => {
  // La extensión y el Content-Type los escribe quien sube el fichero.
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  expect(tipoDe(png, 'retrato.jpg')).toBe('image/png')
})

it('RIFF no basta para WEBP', () => {
  // RIFF lo comparten WAV y AVI. Hay que mirar el byte 8.
  const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
  expect(tipoDe(wav, 'x.webp')).toBeNull()
})

it('guarda con UUID y no con el nombre que llega', () => {
  // El nombre original solo se conserva para enseñarlo. Componer una ruta con él sería
  // dejar que quien sube elija dónde se escribe.
  const clave = clavePara('../../etc/passwd')
  expect(clave).toMatch(/^[0-9a-f-]{36}\.[a-z]+$/)
})
```

- [ ] **Paso 2: el tope antes de leer a memoria**

```ts
it('rechaza por tamaño antes de leer el fichero', async () => {
  // Un arrayBuffer() de un archivo de dos gigas se los trae enteros al servidor antes de
  // que nadie lo rechace.
})
```

- [ ] **Paso 3: escribir, verlas pasar, comprometer**

---

### Tarea 10: `GET /media/[id]` — con la misma puerta que la invitación

**Archivos**
- Crear: `src/app/media/[id]/route.ts`
- Prueba: `src/app/media/[id]/route.test.ts`

- [ ] **Paso 1: las pruebas, que son la tarea entera**

```ts
it('sirve la imagen de un evento público sin sesión', async () => {
  // El invitado no tiene sesión y nunca la va a tener.
})

it('responde 404 con un identificador desconocido', async () => {
  // 404, nunca 403: un 403 confirmaría que ese identificador existe.
})

it('responde 404 si el evento lleva contraseña y no está desbloqueado', async () => {
  // Un <img> no puede ser el agujero por el que se rodea el candado, igual que
  // respondAction no podía serlo. La puerta cierra las lecturas, no solo el render.
})

it('sirve la imagen del evento con contraseña cuando la cookie está', async () => { … })

it('no lleva Content-Disposition: attachment', () => {
  // Aquí la imagen se pinta, no se descarga: es lo contrario del comprobante.
})
```

- [ ] **Paso 2: verlas fallar, escribir el handler, verlas pasar**

`Cache-Control: private, max-age=3600`. **Nunca `public`**: una imagen de un evento con
contraseña no puede quedarse en una caché compartida.

- [ ] **Paso 3: comprometer**

---

### Tarea 11: Subida de imágenes desde el panel

**Archivos**
- Modificar: `src/modules/events/actions.ts`, `src/modules/events/ui/ContentBlockForms.tsx`
- Prueba: la de `verify:tenancy` cubre las acciones

Toda acción nueva: `requireSession()` **en su propio cuerpo**, luego
`requireEventAccess(actor, ref)`, y devuelve `{ status, message }` que la pantalla pinta.

- [ ] **Paso 1: escribir las acciones y sus pruebas**
- [ ] **Paso 2: `pnpm verify:tenancy` en verde sin una sola excepción apuntada**
- [ ] **Paso 3: comprobar que falla al quitarle la guardia a una**, y devolverla
- [ ] **Paso 4: comprometer**

---

# Fase 3 — Los dieciséis diseños

Dieciséis tareas, **una por diseño**, en tandas de dos o tres. Cada tanda se cierra entera
—unitarias, e2e, `typecheck`, `lint`, `verify:boundaries`— antes de empezar la siguiente.

## El procedimiento, igual para los dieciséis

No se repite en cada tarea. **Se aplica a las dieciséis.**

- [ ] **1. Leer el original entero** en el rango exacto de la tabla de claves, más los
  auxiliares que use. No portar de memoria ni por partes: un `marginTop: 56` que se
  convierte en 48 no lo caza ninguna prueba y se ve.

- [ ] **2. Crear `<clave>.view.tsx`** con el marcado portado, y `<clave>.tsx` con la
  `ThemeDefinition` cuyo `Component` ya apunta al `dynamic` de la vista, sustituyendo al
  `PendienteView` de la Tarea 3.

- [ ] **3. Sustituir los datos clavados por el contenido.** Cada literal del original
  —«Camila», «Iglesia San Esteban», «17:00», «Black Tie»— sale de `content`. **El mismo
  literal pasa a ser el `defaultContent`** de esa definición: así el escaparate se ve
  idéntico a la maqueta y el evento real se ve con lo suyo. Ni un dato de muestra
  sobrevive dentro del marcado.

- [ ] **4. Sustituir los tres postizos de la maqueta por las ranuras.** `<RSVP>`,
  `<GiftRegistry>` y `<Guestbook>` de `utils.jsx` se tiran y en su hueco exacto van
  `slots.rsvp`, `slots.registry` y `slots.guestbook`. Los seis temas de XV con formulario
  propio (`xv`, `xv-natalia`, `xv-valentina`, `xv-luciana`, `xv-fantasia`, `xv-valeria`,
  `xv-mariana`) pintan **su** formulario con `useRsvp`, no el genérico.

- [ ] **5. Sustituir toda ruta de imagen** por `themeAsset('<clave>', '<archivo>')`, con el
  nombre ya normalizado por la Tarea 2.

- [ ] **6. Sacar los hexadecimales a la `palette`** de la definición. Ninguno suelto en el
  cuerpo del componente: si hace falta un color nuevo, es una entrada más de la paleta.

- [ ] **7. Los rótulos fijos, al diccionario**, en `dictionary.ts` + `es.ts` + `en.ts`, en
  el mismo commit. `DÍAS`, `HRS`, `MIN`, `SEG`, `Faltan`, `Itinerario`, `Código de
  Vestimenta`, `Junto a mis padres`, lo que traiga el diseño.

- [ ] **8. Comparar contra el original, lado a lado.** Abrir
  `"…/VallHallaWwepApp/Catalogo.html"` en el navegador, abrir la tarjeta de ese diseño, y
  abrir `/es/modelos/<clave>` al lado. Repasar: tipografías, tamaños, márgenes, colores,
  orden de secciones, animaciones de entrada, fondos, iconos. **Este paso es la tarea.**
  Lo demás es andamiaje.

- [ ] **9. Los cinco anchos**: 390, 560, 860, 900, 1280. Estos diseños son verticales de
  móvil y es donde se rompen. Ni desbordes ni `scrollWidth` mayor que el ancho.

- [ ] **10. Movimiento reducido**: activar la preferencia en el navegador y comprobar que
  la invitación se lee entera. Ni un bloque en blanco.

- [ ] **11. Una e2e**: un evento con ese tema, abierto desde el enlace del invitado, que
  **confirma asistencia de verdad** y ve su respuesta al volver.

- [ ] **12. Comprobación completa y commit**, uno por diseño:

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm verify:boundaries && pnpm verify:tenancy
git add src/modules/events/ui/themes src/shared/i18n tests/e2e
git commit -m "feat: el tema <clave> — <nombre del diseño>"
```

## Las tandas

| Tanda | Tareas | Temas | Por qué juntos |
|---|---|---|---|
| A | 12–14 | `boda`, `boda-cin`, `boda-ed` | Comparten `WeddingMagicBg`, `IntroCover` y `PhotoSlot`, y ninguno usa imágenes propias: es la tanda que valida el kit antes de que el porte dependa de él |
| B | 15–17 | `boda-bot`, `xv-isabelle`, `civil` | La flora entera (`FloralCorner`, `FloralSpray`, `BotanicalTimeline`, `RoseCluster`) y las primeras imágenes propias |
| C | 18–20 | `aniv`, `eng`, `dest` | Los tres héroes que faltan: `HeroAnniversary`, `HeroRings`, `HeroOcean` |
| D | 21–23 | `xv`, `xv-natalia`, `xv-valentina` | Los tres más pesados en imágenes (16, 14 y 11) y el primer formulario propio, `SofiaRSVPForm` |
| E | 24–26 | `xv-luciana`, `xv-fantasia`, `xv-valeria` | Portada propia cada uno, y el itinerario con foto redonda |
| F | 27 | `xv-mariana` | Cierra: `ChromeIcon3D` y el fondo de disco |

Notas de tanda, para no descubrirlas a mitad:

- **Tanda A** es la que decide si el kit está bien. Si `boda` sale fiel sin tocar el kit,
  las cinco siguientes van rodadas. Si hay que tocarlo, **se toca aquí** y no en la tanda D
  con doce temas ya escritos encima.
- **Tanda D**: `xv` y `xv-natalia` son el mismo diseño con distinto contenido y distintas
  imágenes. Comparten portada (`SofiaCover`) y formulario (`SofiaRSVPForm`). Portar `xv`
  entero primero; `xv-natalia` es después casi solo `defaultContent` y `themeAsset`.
- **Tras la tanda A**, medir el compilado (riesgo nº 3):

```bash
rm -rf .next && pnpm build
du -sh .next/standalone 2>/dev/null
```

Si muere con «Reached heap limit» **con `.next` recién borrado**, subir
`NODE_OPTIONS=--max-old-space-size` en el script de `build` antes de buscar la causa en el
código. Ya subió de 8 a 12 a 16 GB por lo mismo tres veces.

---

# Fase 4 — La web pública

---

### Tarea 28: `templates.theme_key` y las dieciséis plantillas reales

**Archivos**
- Crear: `db/migrations/0028_templates_theme_key.sql`
- Modificar: `src/shared/db/schema.ts`, `_journal.json`, `src/shared/db/seed.ts`,
  `src/modules/catalog/domain/template.ts`, `.../infrastructure/mappers.ts`
- Prueba: `src/modules/catalog/domain/template.test.ts`,
  `src/shared/db/seed.test.ts`

- [ ] **Paso 1: la migración**

```sql
-- Qué diseño pinta esta plantilla del escaparate. Sin esta columna, el catálogo vende
-- ocho modelos que el motor no sabe pintar: lo que el cliente elige y lo que el invitado
-- recibe no tienen nada que ver, que es justo lo que esta rebanada cierra.
--
-- Nace anulable y se rellena; se pone `not null` al final, en la misma migración, cuando
-- ya no queda ninguna fila sin él.
alter table templates add column if not exists theme_key varchar(64);

update templates set theme_key = slug where theme_key is null;

alter table templates alter column theme_key set not null;
```

Las dieciséis filas nuevas llevan `slug` = clave del tema, así que `slug` sirve de valor
de relleno para las ocho viejas, que se sustituyen en el paso siguiente.

- [ ] **Paso 2: sustituir las ocho de relleno por las dieciséis reales**

En `seed.ts`, las dieciséis con su categoría (`boda`, `boda-civil`, `xv-anos`, que ya
existen), su paleta —tomada de la `palette` de su definición, no escrita otra vez— y su
`sortOrder`. El seed es **idempotente** y corre también en producción: `on conflict do
update` por `slug`, como ya hace.

Las ocho viejas (`perla`, `marmol`, `laurel`, `carmesi`, `zafiro`, `nacarado`, `onix`,
`sobre`) se **despublican**, no se borran: `is_published = false`. Borrarlas rompería
cualquier enlace repartido, y la fila no estorba.

Esto cierra además dos pendientes de `CLAUDE.md`: las fotos de `zafiro` y `onix` ya no
hacen falta, porque esas plantillas dejan de estar publicadas.

- [ ] **Paso 3: la prueba contra Postgres real**

```ts
it('cada plantilla publicada apunta a una clave de tema registrada', async () => {
  // Vender un modelo que el motor no sabe pintar es la clase de fallo que no se descubre
  // hasta el día de la boda.
  const publicadas = await db.select().from(templates).where(eq(templates.isPublished, true))
  expect(publicadas).toHaveLength(16)
  for (const fila of publicadas) expect(THEME_KEYS).toContain(fila.themeKey)
})
```

- [ ] **Paso 4: la misma comprobación en `preflight`**

`scripts/preflight.ts` lee la base y falla si una plantilla publicada apunta a una clave
que el registro no tiene. Como el resto de `preflight`: **si la base no responde, trata el
dato como vacío y bloquea**. Desplegar sin poder comprobarlo no es desplegar comprobado.

- [ ] **Paso 5: comprobar que `preflight` falla de verdad**

Despublicar a mano una clave del registro, correr `pnpm preflight`, ver el código 1, y
devolverla. Una puerta que nunca se ha visto cerrar no es una puerta.

- [ ] **Paso 6: comprometer**

---

### Tarea 29: `/[locale]/modelos/[slug]` — la vista previa

**Archivos**
- Crear: `src/app/(site)/[locale]/modelos/[slug]/page.tsx`
- Modificar: `src/app/robots.ts`, `src/app/sitemap.ts`,
  `src/shared/i18n/{dictionary,es,en}.ts`
- Prueba: `tests/e2e/modelos.spec.ts`

- [ ] **Paso 1: la página**

Pinta el tema entero con el `defaultContent` de su propia definición y un `Event` de
muestra armado en la página —no de la base: es un escaparate, no un evento—.

Las tres ranuras van **inertes**, con un aviso de vista previa: un formulario de muestra
que parece funcionar y no guarda nada es peor que no tenerlo. Botones `disabled` y una
línea que lo dice.

- [ ] **Paso 2: SEO**

`canonical` y `alternates` como el resto del sitio, entrada en el `sitemap`, y
`/modelos/` **fuera** del `disallow` de `robots.txt` — al contrario que `/r/` y `/i/`,
esto es escaparate y queremos que se indexe.

`robots.ts` y `sitemap.ts` ya llevan `export const dynamic = 'force-dynamic'`, y así se
quedan: cualquier ruta prerrenderizada se queda con el `SITE_URL` de relleno del
Dockerfile horneado en la imagen para siempre. Le pasó a `robots.txt`.

- [ ] **Paso 3: la e2e**

```ts
it('los dieciséis responden 200 y pintan su nombre', async ({ page }) => { … })
it('el RSVP de la vista previa no escribe nada', async ({ page }) => { … })
```

- [ ] **Paso 4: comprometer**

---

### Tarea 30: Las portadas del catálogo

**Archivos**
- Crear: `public/temas/<clave>/portada.avif` (16), `scripts/capture-theme-covers.ts`
- Modificar: `src/modules/catalog/ui/TemplateCard.tsx`

- [ ] **Paso 1: capturar las dieciséis**

Un guion de Playwright que abre `/es/modelos/<clave>` en 560×840, espera a que las fuentes
carguen (`document.fonts.ready`) y **desactiva las animaciones** —con
`prefers-reduced-motion` no bastaría para los fondos de partículas, que no se pintan:
aquí se quiere el diseño quieto y completo, así que se congela con CSS—, y guarda la
captura.

- [ ] **Paso 2: la tarjeta**

`TemplateCard` pinta la captura si la hay. **La tarjeta de papel dibujada se queda como
respaldo** cuando falte: media tarjeta con el monograma se lee como un fallo de carga, y
esa lección ya está escrita.

- [ ] **Paso 3: mirarlas las dieciséis** y volver a capturar la que salga a medio cargar.

- [ ] **Paso 4: comprometer**

---

# Fase 5 — El panel

---

### Tarea 31: La rejilla de temas

**Archivos**
- Crear: `src/modules/events/ui/ThemePicker.tsx`
- Modificar: `src/modules/events/ui/EventForm.tsx`
- Prueba: `ThemePicker.test.tsx`, `tests/e2e/panel.spec.ts`

Diecisiete claves sueltas en un `<select>` no sirven para elegir un diseño. Rejilla de
miniaturas agrupada por categoría, con la portada de la Tarea 30, y cada una enlaza a
`/modelos/<clave>` en pestaña nueva para verla entera antes de decidir.

Se pinta con `PanelKit`, no con clases sueltas: botón, píldora y chip viven ahí, y
pintarlos a mano fue lo que metió el dorado de la web pública donde `Dashboard.html` pone
tinta oscura.

`auto-fill minmax`, no `breakpoints`: es la regla de las rejillas de tarjetas del panel.

- [ ] **Paso 1: la prueba**, **2: escribirlo**, **3: e2e**, **4: comprometer**

---

### Tarea 32: El formulario de contenido

**Archivos**
- Crear: `src/modules/events/ui/ContentBlockForms.tsx`
- Modificar: `src/app/(panel)/panel/eventos/[slug]/(gestion)/configuracion/page.tsx`,
  `src/modules/events/actions.ts`
- Prueba: `ContentBlockForms.test.tsx`, `tests/e2e/contenido.spec.ts`

Un bloque, un formulario, una Server Action. **Solo se enseñan las secciones que el tema
elegido pinta**, leídas de su `sections`: pedirle un itinerario a un diseño que no lo
tiene es pedir trabajo que no se ve.

El bloque abierto va **en la URL** (`?bloque=itinerario`), no en `useState`: cada Server
Action revalida el árbol y remonta el componente, y ese `useState` se pierde en ese mismo
instante. Lo cazó la e2e de los recordatorios.

- [ ] **Paso 1: la e2e primero**, que es la que caza el remonte:

```ts
it('guarda el itinerario y lo enseña al recargar', async ({ page }) => { … })
it('un tema sin itinerario no enseña ese bloque', async ({ page }) => { … })
it('enseña el fallo cuando la acción falla', async ({ page }) => { … })
```

- [ ] **Paso 2: escribirlo**, **3: verlas pasar**, **4: `verify:tenancy`**, **5: comprometer**

---

# Fase 6 — Cierre

---

### Tarea 33: Retención

**Archivos**
- Modificar: `scripts/maintenance.ts`,
  `src/modules/events/application/anonymize-expired-events.ts`
- Prueba: contra Postgres real

Un retrato de la novia y una lista de padrinos son datos personales, y hoy no hay nada que
los barra. Al anonimizar un evento vencido: **vaciar `event_content` y borrar sus imágenes
del disco**.

- [ ] **Paso 1: la prueba**

```ts
it('al vencer, borra el contenido y las imágenes del disco', async () => { … })
it('no toca el contenido de un evento que no ha vencido', async () => { … })
```

- [ ] **Paso 2: escribirlo**, **3: verla pasar**, **4: comprometer**

---

### Tarea 34: Los anchos, sobre los dieciséis

**Archivos**
- Modificar: `tests/e2e/responsive.spec.ts`

Mide **dos cosas distintas**, y las dos hacen falta: los elementos que se salen sin
ancestro que los desplace —`body` lleva `overflow-x: hidden`, así que el desborde no da
barra, da contenido cortado— **y** el `scrollWidth` del documento, que es lo único que
caza el caso del absoluto dentro de un `overflow-x-auto`.

Cinco anchos: 390, 560, 860, 900, 1280. Sobre los dieciséis.

Esta suite abre **su propia conexión** a Postgres. Compartir la de `fixtures/db` deja a la
segunda escribiendo contra una conexión cerrada.

- [ ] **Paso 1: ampliarla**, **2: correrla**, **3: arreglar lo que salga**, **4: comprometer**

---

### Tarea 35: El compilado y la documentación

- [ ] **Paso 1: compilar de cero**

```bash
lsof -ti :3100 | xargs kill -9 2>/dev/null
rm -rf .next && pnpm build
```

Si muere con «Reached heap limit», **subir el heap antes de buscar la causa en el
código**: el rastreo de ficheros del `output: standalone` bajo webpack crece con cada
módulo, y ya subió de 8 a 12 a 16 GB por lo mismo.

- [ ] **Paso 2: la suite entera**

```bash
pnpm test && pnpm typecheck && pnpm lint && \
pnpm verify:boundaries && pnpm verify:tenancy && pnpm test:e2e
```

- [ ] **Paso 3: `pnpm preflight`**

Esperado: sigue cortando por los pendientes del usuario (WhatsApp, dominio, correo, datos
de transferencia). **No** por plantillas sin tema.

- [ ] **Paso 4: actualizar `CLAUDE.md`**

La sección «Estado», la tabla de documentos con el spec y este plan, las notas nuevas
—los temas, el kit sin hexadecimales, `event_content`, `/media/`, las ranuras— y quitar de
«Pendiente del usuario» las fotos de `zafiro` y `onix`, que dejan de estar publicadas.

- [ ] **Paso 5: el documento de traspaso** en `docs/superpowers/`, con lo que quedó fuera:
  la sección XV V2, las demás categorías, el editor visual y el audio del reproductor.

- [ ] **Paso 6: comprometer**

---

## Lo que este plan NO hace

- La sección **«XV Años V2»** (nueve diseños). Decisión del usuario.
- Sacramentos, Cumpleaños, Despedidas, Festejos, Hitos, Profesional.
- El editor visual de la maqueta (`Editor.html`, `design-canvas.jsx`).
- Audio real en el reproductor de música: la maqueta lo pinta y no suena; aquí también.
