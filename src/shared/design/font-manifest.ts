/**
 * El **dato** de las tipografías, separado del cargador.
 *
 * `next/font/local` es una macro que resuelve al compilar: importarla desde una prueba
 * revienta con «default is not a function», y por eso `fonts.ts` nunca tuvo ninguna.
 * Aquí no se importa nada de Next, así que esto sí se puede comprobar —que los ficheros
 * declarados están en disco, que ninguna variable CSS se repite— antes de que un build
 * de varios minutos muera sin decir cuál falta.
 *
 * Es además lo único que necesita `ThemeDefinition.fonts`: un tema declara **claves**, no
 * objetos de fuente, así que el registro de temas no arrastra el cargador.
 */

/**
 * Las doce familias que piden los dieciséis diseños de invitación.
 *
 * Tres ya estaban en el proyecto —Cormorant Garamond, Space Grotesk y JetBrains Mono—.
 * Jost no aparece: es de la web pública marfil y no la usa ningún tema.
 */
export type FontKey =
  | 'cormorant'
  | 'spaceGrotesk'
  | 'jetbrainsMono'
  | 'greatVibes'
  | 'alexBrush'
  | 'allura'
  | 'italiana'
  | 'marcellus'
  | 'cinzel'
  | 'dmSans'
  | 'newsreader'
  | 'spectral'
  | 'playfairDisplay'

export const FONT_VARIABLES = {
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
  playfairDisplay: '--font-playfair-display',
} as const satisfies Record<FontKey, string>

/**
 * Las pilas de respaldo, y son reales a propósito: mientras la fuente carga —o el día
 * que no cargue— lo que se lee tiene que parecerse a lo que el diseño quiso. Un `serif`
 * a secas detrás de Great Vibes convierte «Camila» de caligrafía en Times.
 */
export const FONT_FALLBACKS = {
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
  playfairDisplay: ['Cormorant Garamond', 'Georgia', 'serif'],
} as const satisfies Record<FontKey, readonly string[]>

/**
 * Los ficheros que `fonts.ts` carga, para poder comprobar que están.
 *
 * Spectral va en tres pesos sueltos y no como variable: Google no publica eje variable
 * para esa familia. Se comprobó pidiéndolo.
 */
export const FONT_FILES: readonly string[] = [
  'cormorant-garamond-300.woff2',
  'cormorant-garamond-400.woff2',
  'cormorant-garamond-500.woff2',
  'cormorant-garamond-600.woff2',
  'space-grotesk-variable.woff2',
  'jetbrains-mono-variable.woff2',
  'great-vibes-400.woff2',
  'alex-brush-400.woff2',
  'allura-400.woff2',
  'italiana-400.woff2',
  'marcellus-400.woff2',
  'cinzel-variable.woff2',
  'dm-sans-variable.woff2',
  'newsreader-variable.woff2',
  'spectral-200.woff2',
  'spectral-300.woff2',
  'spectral-400.woff2',
  'playfair-display-600-italic.woff2',
]
