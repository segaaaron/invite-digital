import localFont from 'next/font/local'
import type { FontKey } from './font-manifest'

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
// Doce familias las piden los dieciséis diseños de boda y XV años. Locales, no enlazadas a
// Google: una invitación que depende de un tercero para verse bien no se ve bien el día
// que ese tercero falla, y además le contaría a Google quién abre la invitación de una
// boda.
//
// **Todo va escrito como literal, y no es estilo.** `next/font` es una macro que resuelve
// al compilar: con `variable: FONT_VARIABLES.cinzel` o un `fallback: [...ALGO]` el
// compilador aborta con «Font loader values must be explicitly written literals», y el
// typecheck no dice nada porque son cadenas y arrays perfectamente válidos. Se descubre al
// abrir la página. Que esto no se separe de `font-manifest.ts` lo comprueba una prueba.
// ─────────────────────────────────────────────────────────────────────────────

export const greatVibes = localFont({
  variable: '--font-great-vibes',
  display: 'swap',
  fallback: ['Snell Roundhand', 'Apple Chancery', 'cursive'],
  src: [
    { path: '../../../public/fonts/great-vibes-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const alexBrush = localFont({
  variable: '--font-alex-brush',
  display: 'swap',
  fallback: ['Snell Roundhand', 'Apple Chancery', 'cursive'],
  src: [
    { path: '../../../public/fonts/alex-brush-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const allura = localFont({
  variable: '--font-allura',
  display: 'swap',
  fallback: ['Snell Roundhand', 'Apple Chancery', 'cursive'],
  src: [
    { path: '../../../public/fonts/allura-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const italiana = localFont({
  variable: '--font-italiana',
  display: 'swap',
  fallback: ['Didot', 'Bodoni MT', 'serif'],
  src: [
    { path: '../../../public/fonts/italiana-400.woff2', weight: '400', style: 'normal' },
  ],
})

export const marcellus = localFont({
  variable: '--font-marcellus',
  display: 'swap',
  fallback: ['Palatino', 'Book Antiqua', 'serif'],
  src: [
    { path: '../../../public/fonts/marcellus-400.woff2', weight: '400', style: 'normal' },
  ],
})

// Variables: un solo woff2 cubre todo el rango de pesos.
export const cinzel = localFont({
  variable: '--font-cinzel',
  display: 'swap',
  fallback: ['Optima', 'Palatino', 'serif'],
  src: [
    { path: '../../../public/fonts/cinzel-variable.woff2', weight: '400 700', style: 'normal' },
  ],
})

export const dmSans = localFont({
  variable: '--font-dm-sans',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  src: [
    { path: '../../../public/fonts/dm-sans-variable.woff2', weight: '300 700', style: 'normal' },
  ],
})

/** La geométrica de «Esencia», de su maqueta (`esencia.jsx`): Outfit en pesos 200–500. */
export const outfit = localFont({
  variable: '--font-outfit',
  display: 'swap',
  fallback: ['Avenir Next', 'Helvetica Neue', 'Arial', 'sans-serif'],
  src: [{ path: '../../../public/fonts/outfit-variable.woff2', weight: '100 900', style: 'normal' }],
})

export const newsreader = localFont({
  variable: '--font-newsreader',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  src: [
    { path: '../../../public/fonts/newsreader-variable.woff2', weight: '300 500', style: 'normal' },
  ],
})

// Spectral no tiene eje variable en Google —se comprobó pidiéndolo—, así que van los
// tres pesos que los diseños usan.
/**
 * La cursiva de «Palacio Griego»: sus lugares, «mi historia» y el código de vestimenta.
 *
 * Es la única familia de la maqueta que faltaba, y se veía: esos bloques salían en la
 * caligrafía inglesa del diseño en vez de en una romana en cursiva. Un solo corte —600 en
 * cursiva—, que es el único que su componente usa.
 */
export const playfairDisplay = localFont({
  variable: '--font-playfair-display',
  display: 'swap',
  fallback: ['Cormorant Garamond', 'Georgia', 'serif'],
  src: [{ path: '../../../public/fonts/playfair-display-600-italic.woff2', weight: '600', style: 'italic' }],
})

export const spectral = localFont({
  variable: '--font-spectral',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
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
  variable: '--font-cormorant',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  src: [
    { path: '../../../public/fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
})

export const spaceGroteskTheme = localFont({
  variable: '--font-space-grotesk',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
  src: [
    { path: '../../../public/fonts/space-grotesk-variable.woff2', weight: '300 700', style: 'normal' },
  ],
})

export const jetbrainsMonoTheme = localFont({
  variable: '--font-jetbrains-mono',
  display: 'swap',
  fallback: ['SFMono-Regular', 'Menlo', 'monospace'],
  src: [
    { path: '../../../public/fonts/jetbrains-mono-variable.woff2', weight: '300 600', style: 'normal' },
  ],
})

/**
 * El cargador por clave. Lo usan el layout de invitado y la vista previa del catálogo para
 * componer la `className` con las variables de **las fuentes que ese tema declara**.
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
  playfairDisplay,
  outfit,
} as const satisfies Record<FontKey, { variable: string }>
