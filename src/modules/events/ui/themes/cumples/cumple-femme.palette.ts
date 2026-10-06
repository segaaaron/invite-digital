import { acentoDe } from '../kit/acento'

/** La paleta de «Femme Fatale»: terciopelo granate, oro viejo y crema de tocador. */
const BASE = {
  /** El negro de la portada, para el instante en que el arte todavía no llegó. */
  noche: '#05020a',
  /** Los rótulos y el filete de las tarjetas. */
  oro: '#d8b98a',
  /** El oro de los marcos de las fotos, del botón del mapa y de los «sí». */
  oroViejo: '#c9a96e',
  crema: '#F3E6CC',
  /** El botón de enviar y el del reproductor. */
  vino: '#8C1E32',
  /** La tinta sobre el oro: el texto de los botones llenos. */
  tintaSobreOro: '#1E0A0E',
  /** El vidrio de las tarjetas: granate casi negro, al 68 %. */
  vidrio: 'rgba(20,6,10,0.68)',
  filete: 'rgba(216,185,138,0.45)',
  fileteSuave: 'rgba(216,185,138,0.22)',
  fileteEtiqueta: 'rgba(216,185,138,0.55)',
  /** El velo que oscurece el fondo arriba —donde va el titular— y lo deja ver abajo. */
  velo: 'linear-gradient(180deg, rgba(14,3,6,.82) 0%, rgba(14,3,6,.55) 22%, rgba(14,3,6,.15) 45%, rgba(14,3,6,.08) 70%, rgba(14,3,6,.25) 100%)',
  /** El punto del alfiler del mapa. */
  punto: '#000',
  /** El aro oscuro que separa el marco de las fotos del fondo. */
  aro: 'rgba(14,3,6,.35)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro, oroViejo: BASE.oroViejo }, BASE.noche)
const C = A.colores
export const ACENTO = A.definicion

export const PALETA = {
  ...BASE,
  ...C,
  filete: A.alfa('oro', 0.45),
  fileteSuave: A.alfa('oro', 0.22),
  fileteEtiqueta: A.alfa('oro', 0.55),
} as const
