import { themeAsset } from './assets'

/**
 * El arte de portada de cada diseño, sin texto: lo que se ve al abrir la invitación comprada.
 * Lo usa la vista previa del enlace en WhatsApp, con los nombres del cliente encima. Los
 * diseños cuya portada es un sobre dibujado —sin imagen— usan la del catálogo.
 */
const PORTADAS: Partial<Record<string, string>> = {
  xv: themeAsset('xv', 'bajo-el-mar1.avif'),
  'xv-natalia': themeAsset('xv-natalia', 'fondo-musical.avif'),
  'xv-isabelle': themeAsset('xv-isabelle', 'portada-griega.avif'),
  'xv-valeria': themeAsset('xv-valeria', 'marco-guindo-portada.avif'),
  'xv-fantasia': themeAsset('xv-fantasia', 'noche-estrellada-portada.avif'),
  'xv-mariana': themeAsset('xv-mariana', 'fondo-disco-mariana-opt.avif'),
  'xv-valentina': themeAsset('xv-valentina', 'mascarada-morada.avif'),
  'xv-luciana': themeAsset('xv-luciana', 'bosque-verdee.avif'),
  'boda-ed': themeAsset('boda-ed', 'novios-verde.avif'),
  'boda-bot': themeAsset('boda-bot', 'wedding-couple.avif'),
  'cumple-beer': themeAsset('cumple-beer', 'portada-medallon.avif'),
}

/** La ruta pública (`/temas/…` o `/templates/…`) de la portada de ese diseño. */
export const portadaParaCompartir = (temaKey: string): string => PORTADAS[temaKey] ?? `/templates/${temaKey}.avif`

/**
 * El hueco del arte donde va rotulado el nombre, en coordenadas del propio arte.
 *
 * «Cervecería Vintage» es el único diseño cuya portada trae un medallón vacío esperando el
 * nombre: al abrir la invitación lo escribe `CumpleBeerCover`, y la vista previa de WhatsApp
 * tiene que escribirlo en el mismo sitio. Sin esto, el enlace compartido enseñaba el círculo
 * **vacío** y el nombre suelto abajo, sobre el arte.
 */
const MEDALLONES: Partial<Record<string, MedallonDeCompartir>> = {
  'cumple-beer': { arte: { ancho: 768, alto: 1376 }, x: 384, y: 548, ancho: 377 },
}

export type MedallonDeCompartir = {
  /** El tamaño del arte al que se refieren las coordenadas. */
  readonly arte: { readonly ancho: number; readonly alto: number }
  /** El centro del hueco y el ancho que puede ocupar el nombre. */
  readonly x: number
  readonly y: number
  readonly ancho: number
}

/** El medallón de ese diseño, si su arte tiene uno. */
export const medallonDeCompartir = (temaKey: string): MedallonDeCompartir | null => MEDALLONES[temaKey] ?? null

