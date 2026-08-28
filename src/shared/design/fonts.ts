import localFont from 'next/font/local'
import { FONT_FALLBACKS, FONT_VARIABLES, type FontKey } from './font-manifest'

export const display = localFont({
  variable: '--font-display-raw',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
})

export const sans = localFont({
  variable: '--font-sans-raw',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/jost-200.woff2', weight: '200', style: 'normal' },
    { path: '../../../public/fonts/jost-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/jost-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/jost-500.woff2', weight: '500', style: 'normal' },
  ],
})

/**
 * Las dos tipografías del **panel**, que son las de `docs/design-reference/dashboard/`:
 * Space Grotesk para el texto y JetBrains Mono para cifras y rótulos.
 *
 * No alcanzan a la web pública ni a la invitación: la maqueta Ivory usa Jost, y son dos
 * piezas distintas del mismo atelier. Por eso `panelSans` reutiliza el mismo nombre de
 * variable que `sans` —solo cambia quién la define, y la define el layout del panel—.
 *
 * Los dos ficheros son **variables**: Google sirve un único woff2 por familia que cubre
 * todo el rango de pesos, así que bajar cuatro pesos descargaba cuatro veces el mismo
 * archivo.
 */
export const panelSans = localFont({
  variable: '--font-sans-raw',
  display: 'swap',
  src: [{ path: '../../../public/fonts/space-grotesk-variable.woff2', weight: '300 700', style: 'normal' }],
})

export const panelMono = localFont({
  variable: '--font-mono-raw',
  display: 'swap',
  src: [{ path: '../../../public/fonts/jetbrains-mono-variable.woff2', weight: '300 600', style: 'normal' }],
})

// ─────────────────────────────────────────────────────────────────────────────
// Las tipografías de los temas de invitación
//
// Doce familias las piden los dieciséis diseños de boda y XV años. Locales, no
// enlazadas a Google: una invitación que depende de un tercero para verse bien no se ve
// bien el día que ese tercero falla, y además le contaría a Google quién abre la
// invitación de una boda.
//
// **Cada tema declara las suyas** en su `ThemeDefinition` y el layout de invitado carga
// solo esas. Las doce en toda invitación son medio megabyte de tipografía que ese diseño
// no pinta.
//
// El dato —claves, variables, respaldos y nombres de fichero— vive en `font-manifest.ts`,
// que no importa nada de Next y por eso sí se puede comprobar en una prueba. Aquí solo
// está el cargador.
// ─────────────────────────────────────────────────────────────────────────────

export const greatVibes = localFont({
  variable: FONT_VARIABLES.greatVibes,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.greatVibes],
  src: [
    { path: '../../../public/fonts/great-vibes-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const alexBrush = localFont({
  variable: FONT_VARIABLES.alexBrush,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.alexBrush],
  src: [
    { path: '../../../public/fonts/alex-brush-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const allura = localFont({
  variable: FONT_VARIABLES.allura,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.allura],
  src: [
    { path: '../../../public/fonts/allura-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const italiana = localFont({
  variable: FONT_VARIABLES.italiana,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.italiana],
  src: [
    { path: '../../../public/fonts/italiana-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const marcellus = localFont({
  variable: FONT_VARIABLES.marcellus,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.marcellus],
  src: [
    { path: '../../../public/fonts/marcellus-400.woff2', weight: '400', style: 'normal' },
  ],
})

// Variables: un solo woff2 cubre todo el rango de pesos. Bajar cuatro pesos sueltos
// descargaba cuatro veces el mismo archivo, que es la lección que ya dejaron las dos del
// panel.
export const cinzel = localFont({
  variable: FONT_VARIABLES.cinzel,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.cinzel],
  src: [
    { path: '../../../public/fonts/cinzel-variable.woff2', weight: '400 700', style: 'normal' },
  ],
})

export const dmSans = localFont({
  variable: FONT_VARIABLES.dmSans,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.dmSans],
  src: [
    { path: '../../../public/fonts/dm-sans-variable.woff2', weight: '300 700', style: 'normal' },
  ],
})

export const newsreader = localFont({
  variable: FONT_VARIABLES.newsreader,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.newsreader],
  src: [
    { path: '../../../public/fonts/newsreader-variable.woff2', weight: '300 500', style: 'normal' },
  ],
})

// Spectral no tiene eje variable en Google —se comprobó pidiéndolo—, así que van los
// tres pesos que los diseños usan.
export const spectral = localFont({
  variable: FONT_VARIABLES.spectral,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.spectral],
  src: [
    { path: '../../../public/fonts/spectral-200.woff2', weight: '200', style: 'normal' },
    { path: '../../../public/fonts/spectral-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/spectral-400.woff2', weight: '400', style: 'normal' },
  ],
})

// Las tres que ya estaban se cargan otra vez con su variable de tema: en la invitación
// se llaman por su nombre de familia, no por el papel que hacen en el panel o en la web
// pública. `next/font` deduplica el mismo fichero, así que no se baja dos veces.
export const cormorantTheme = localFont({
  variable: FONT_VARIABLES.cormorant,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.cormorant],
  src: [
    { path: '../../../public/fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
})

export const spaceGroteskTheme = localFont({
  variable: FONT_VARIABLES.spaceGrotesk,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.spaceGrotesk],
  src: [
    { path: '../../../public/fonts/space-grotesk-variable.woff2', weight: '300 700', style: 'normal' },
  ],
})

export const jetbrainsMonoTheme = localFont({
  variable: FONT_VARIABLES.jetbrainsMono,
  display: 'swap',
  fallback: [...FONT_FALLBACKS.jetbrainsMono],
  src: [
    { path: '../../../public/fonts/jetbrains-mono-variable.woff2', weight: '300 600', style: 'normal' },
  ],
})

/**
 * El cargador por clave. Lo usa el layout de invitado para componer la `className` con
 * las variables de **las fuentes que ese tema declara**, y nada más.
 */
export const themeFonts = {
  cormorant: cormorantTheme,
  spaceGrotesk: spaceGroteskTheme,
  jetbrainsMono: jetbrainsMonoTheme,
  greatVibes,
  alexBrush,
  allura,
  italiana,
  marcellus,
  cinzel,
  dmSans,
  newsreader,
  spectral,
} as const satisfies Record<FontKey, { variable: string }>
