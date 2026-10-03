/**
 * El estilo de un evento (Gala o más, `0088`): **el color de acento y la letra**, sobre la piel
 * de su diseño.
 *
 * El color no repinta la invitación entera: cada diseño marca qué colores son su acento —los de
 * los titulares, filetes, botones— y esos se recalculan desde el elegido conservando la relación
 * que tenían con el principal (más claro, más oscuro, más apagado). El fondo y las ilustraciones
 * no cambian: el arte va pintado en la imagen. Solo se ofrecen los colores que se leen sobre el
 * fondo del diseño (contraste 3:1, el de los textos grandes de WCAG).
 *
 * La letra cambia la caligrafía y, donde el diseño tiene letra propia de titulares, esa. El
 * texto corrido nunca: es lo que se lee.
 */

export type EstiloDelEvento = {
  /** `#rrggbb` de `COLORES_DE_ACENTO`, o nulo para el del diseño. */
  readonly acento: string | null
  readonly caligrafia: string | null
  readonly titulares: string | null
}

export const SIN_ESTILO: EstiloDelEvento = { acento: null, caligrafia: null, titulares: null }

export const hayEstilo = (e: EstiloDelEvento): boolean => e.acento !== null || e.caligrafia !== null || e.titulares !== null

/** Lo que un diseño declara de su acento: el color principal, su familia y el fondo donde se lee. */
export type AcentoDelDiseno = {
  readonly principal: string
  /** Cada color de la familia con su valor original, por su nombre en la paleta. */
  readonly familia: Readonly<Record<string, string>>
  /** El fondo sobre el que va el texto del acento. */
  readonly fondo: string
}

/** La carta de acentos: los de una boda y unos XV, claros y oscuros para fondos de los dos tipos. */
export const COLORES_DE_ACENTO = [
  { nombre: 'Salvia', hex: '#5a705c' },
  { nombre: 'Esmeralda', hex: '#2f6b55' },
  { nombre: 'Azul noche', hex: '#24364f' },
  { nombre: 'Azul empolvado', hex: '#7b93ac' },
  { nombre: 'Lavanda', hex: '#8c7aa8' },
  { nombre: 'Borgoña', hex: '#7a2335' },
  { nombre: 'Terracota', hex: '#b4654a' },
  { nombre: 'Rosa empolvado', hex: '#c98b8f' },
  { nombre: 'Fucsia', hex: '#b0306a' },
  { nombre: 'Oro', hex: '#b8894f' },
  { nombre: 'Negro', hex: '#222222' },
  { nombre: 'Champán', hex: '#d8c3a0' },
  { nombre: 'Oro claro', hex: '#e2c47a' },
  { nombre: 'Rosa claro', hex: '#f2c4ce' },
  { nombre: 'Lila claro', hex: '#cdb8ec' },
  { nombre: 'Plata', hex: '#c8cad0' },
] as const

/** Las caligrafías y letras de titulares que se ofrecen (claves de `FontKey`). */
export const CALIGRAFIAS = [
  { clave: 'greatVibes', nombre: 'Great Vibes' },
  { clave: 'alexBrush', nombre: 'Alex Brush' },
  { clave: 'allura', nombre: 'Allura' },
] as const
export const TITULARES = [
  { clave: 'cormorant', nombre: 'Cormorant' },
  { clave: 'cinzel', nombre: 'Cinzel' },
  { clave: 'marcellus', nombre: 'Marcellus' },
  { clave: 'italiana', nombre: 'Italiana' },
  { clave: 'playfairDisplay', nombre: 'Playfair' },
] as const

const HEX = /^#[0-9a-f]{6}$/

// --- Color --------------------------------------------------------------------

type Hsl = { h: number; s: number; l: number }

const aRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const aHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`

const aHsl = (hex: string): Hsl => {
  const [r, g, b] = aRgb(hex).map((c) => c / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}

const deHsl = ({ h, s, l }: Hsl): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return aHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

const recorta = (n: number) => Math.min(1, Math.max(0, n))

/** Luminancia relativa de WCAG. */
const luminancia = (hex: string): number => {
  const [r, g, b] = aRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contraste = (a: string, b: string): number => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

/**
 * Un color de la familia, movido desde el elegido igual que estaba del principal original: el
 * tono se conserva (si era un poco más cálido, lo sigue siendo) y lo más claro u oscuro se hace
 * **mezclando con blanco o negro**, como un tinte de verdad. La luz HSL de esa mezcla es lineal,
 * así que guarda exactamente la proporción del original. Con un elegido gris no se inventa tono.
 */
export function trasladar(original: string, principal: string, elegido: string): string {
  const o = aHsl(original)
  const p = aHsl(principal)
  const e = aHsl(elegido)
  const gris = e.s < 0.06
  const base = deHsl({ h: (((e.h + o.h - p.h) % 360) + 360) % 360, s: gris ? e.s : recorta(e.s + Math.min(0, o.s - p.s)), l: e.l })
  const [r, g, b] = aRgb(base)
  if (o.l > p.l && p.l < 1) {
    const t = (o.l - p.l) / (1 - p.l)
    return aHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
  }
  if (o.l < p.l && p.l > 0) {
    const t = (p.l - o.l) / p.l
    return aHex(r * (1 - t), g * (1 - t), b * (1 - t))
  }
  return base
}

/** El nombre de la variable CSS de un color de la familia. */
export const variableDeAcento = (nombre: string): string => `--acento-${nombre}`

/** Los acentos de la carta que se leen sobre el fondo del diseño. */
export const acentosPara = (diseno: AcentoDelDiseno): readonly (typeof COLORES_DE_ACENTO)[number][] =>
  COLORES_DE_ACENTO.filter((c) => contraste(c.hex, diseno.fondo) >= 3)

/** Las variables que repintan la familia del acento con el elegido. Sin elegido, ninguna. */
export function variablesDeAcento(diseno: AcentoDelDiseno, elegido: string | null): Record<string, string> {
  if (elegido === null || !HEX.test(elegido)) return {}
  return Object.fromEntries(
    Object.entries(diseno.familia).map(([nombre, original]) => [variableDeAcento(nombre), trasladar(original, diseno.principal, elegido)]),
  )
}

/** Lo que manda el formulario, contra lo que el diseño admite. */
export function leerEstilo(
  crudo: { acento: string; caligrafia: string; titulares: string },
  admite: { acento: AcentoDelDiseno | null; caligrafia: boolean; titulares: boolean },
): EstiloDelEvento | null {
  const acento = crudo.acento.toLowerCase()
  const okAcento = acento === '' || (admite.acento !== null && acentosPara(admite.acento).some((c) => c.hex === acento))
  const okCaligrafia = crudo.caligrafia === '' || (admite.caligrafia && CALIGRAFIAS.some((c) => c.clave === crudo.caligrafia))
  const okTitulares = crudo.titulares === '' || (admite.titulares && TITULARES.some((c) => c.clave === crudo.titulares))
  if (!okAcento || !okCaligrafia || !okTitulares) return null
  return { acento: acento || null, caligrafia: crudo.caligrafia || null, titulares: crudo.titulares || null }
}
