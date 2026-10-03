import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Mascarada».
 *
 * Reutiliza los nombres de color de la piel marina para que las siete pieles de XV encajen
 * en el mismo esqueleto sin condicionales: lo que allí es lila, aquí es #c9a227.
 */
const BASE = {
  tinta: '#f5efe0',
  orquidea: '#e8c87a',
  uva: '#e8c87a',
  amatista: '#c9b78a',
  violetaHondo: '#f5efe0',
  violeta: '#e8c87a',
  malva: '#e0d5b8',
  bruma: '#c9b78a',
  lila: '#e8c87a',
  lilaFuerte: '#c9a227',
  blanco: '#ffffff',
  vidrio: 'rgba(30,15,48,.82)',
  vidrioFuerte: 'rgba(30,15,48,.88)',
  bordeVidrio: '#c9a227',
  sombra: '0 6px 26px rgba(0,0,0,.45)',
  sombraFuerte: '0 6px 26px rgba(0,0,0,.55)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('orquidea', { orquidea: BASE.orquidea, uva: BASE.uva, violeta: BASE.violeta, lila: BASE.lila, lilaFuerte: BASE.lilaFuerte, bordeVidrio: BASE.bordeVidrio, amatista: BASE.amatista, malva: BASE.malva, bruma: BASE.bruma }, '#1e0f30')
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const
