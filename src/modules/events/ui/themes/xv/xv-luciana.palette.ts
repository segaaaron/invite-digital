import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Bosque Encantado».
 *
 * Reutiliza los nombres de color de la piel marina para que las siete pieles de XV encajen
 * en el mismo esqueleto sin condicionales: lo que allí es lila, aquí es #6e9b4f.
 */
const BASE = {
  tinta: '#eaf3e4',
  orquidea: '#e8c87a',
  uva: '#e8c87a',
  amatista: '#9bc48a',
  violetaHondo: '#f0f7ea',
  violeta: '#e8c87a',
  malva: '#cfe0c2',
  bruma: '#9bc48a',
  lila: '#e8c87a',
  lilaFuerte: '#d9b85c',
  blanco: '#ffffff',
  vidrio: 'rgba(12,28,18,.8)',
  vidrioFuerte: 'rgba(12,32,22,.86)',
  bordeVidrio: '#d9b85c',
  sombra: '0 6px 26px rgba(0,0,0,.45)',
  sombraFuerte: '0 6px 26px rgba(0,0,0,.55)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('orquidea', { orquidea: BASE.orquidea, uva: BASE.uva, violeta: BASE.violeta, lila: BASE.lila, lilaFuerte: BASE.lilaFuerte, bordeVidrio: BASE.bordeVidrio, amatista: BASE.amatista, malva: BASE.malva, bruma: BASE.bruma }, '#0c1c12')
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const
