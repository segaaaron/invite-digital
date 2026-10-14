import type { Locale } from './locales'

/**
 * **Cada idioma con sus propias direcciones** (14 oct, pedido del usuario: «ambos idiomas, bien separados pero
 * sólidos»). Las carpetas del código siguen en español (`/[locale]/bodas`); lo que ve el navegador y Google en
 * inglés es `/en/weddings`. El proxy traduce la pública a la interna (rewrite) y manda la vieja a la nueva (308).
 *
 * Los modelos van dentro de su idioma (`/es/modelos/<clave>`, `/en/designs/<clave>`); su carpeta sigue siendo
 * `/modelos/<idioma>/<clave>` porque es otra raíz de layout.
 */
const NOMBRES = {
  bodas: { es: 'bodas', en: 'weddings' },
  'xv-anos': { es: 'xv-anos', en: 'quinceanera' },
  colecciones: { es: 'colecciones', en: 'collections' },
  privacidad: { es: 'privacidad', en: 'privacy' },
  terminos: { es: 'terminos', en: 'terms' },
  pedido: { es: 'pedido', en: 'order' },
  modelos: { es: 'modelos', en: 'designs' },
} as const satisfies Record<string, Record<Locale, string>>

export type Pagina = keyof typeof NOMBRES

const IDIOMAS = new Set<string>(['es', 'en'])

/** La dirección pública de una página: `rutaDe('en', 'bodas')` → `/en/weddings`; `resto` va detrás (`/ref/X`, `#modelos`). */
export const rutaDe = (locale: Locale, pagina: Pagina, resto = ''): string => `/${locale}/${NOMBRES[pagina][locale]}${resto}`

/** Interna → pública: `/en/bodas` → `/en/weddings`, `/modelos/en/boda-bot` → `/en/designs/boda-bot`. Lo demás, igual. */
export function rutaPublica(interna: string): string {
  const [a = '', b, ...resto] = interna.split('/').filter(Boolean)
  const cola = resto.length > 0 ? `/${resto.join('/')}` : ''
  if (a === 'modelos' && b !== undefined && IDIOMAS.has(b)) return rutaDe(b as Locale, 'modelos', cola)
  if (IDIOMAS.has(a) && b !== undefined && b in NOMBRES) return rutaDe(a as Locale, b as Pagina, cola)
  return interna
}

/** Pública → interna, la que el proxy reescribe: `/en/weddings` → `/en/bodas`, `/es/modelos/x` → `/modelos/es/x`. */
export function rutaInterna(publica: string): string {
  const [a = '', b, ...resto] = publica.split('/').filter(Boolean)
  if (!IDIOMAS.has(a) || b === undefined) return publica
  const pagina = (Object.keys(NOMBRES) as Pagina[]).find((p) => NOMBRES[p][a as Locale] === b)
  if (pagina === undefined) return publica
  const cola = resto.length > 0 ? `/${resto.join('/')}` : ''
  return pagina === 'modelos' ? `/modelos/${a}${cola}` : `/${a}/${pagina}${cola}`
}
