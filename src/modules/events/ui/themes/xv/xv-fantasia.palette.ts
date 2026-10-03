import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Noche Estrellada».
 *
 * Reutiliza los nombres de color de la piel marina para que las siete pieles de XV encajen
 * en el mismo esqueleto sin condicionales: lo que allí es lila, aquí es #d4af5a.
 */
const BASE = {
  tinta: '#f3edd8',
  orquidea: '#d9b85c',
  uva: '#d9b85c',
  amatista: '#c9b78a',
  violetaHondo: '#f7f0dc',
  violeta: '#d9b85c',
  malva: '#ded0ab',
  bruma: '#c9b78a',
  lila: '#d9b85c',
  lilaFuerte: '#d9b85c',
  blanco: '#ffffff',
  vidrio: 'rgba(12,22,50,.6)',
  vidrioFuerte: 'rgba(12,24,48,.82)',
  bordeVidrio: '#d9b85c',
  sombra: '0 6px 24px rgba(0,0,0,.5)',
  sombraFuerte: '0 6px 24px rgba(0,0,0,.6)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('orquidea', { orquidea: BASE.orquidea, uva: BASE.uva, violeta: BASE.violeta, lila: BASE.lila, lilaFuerte: BASE.lilaFuerte, bordeVidrio: BASE.bordeVidrio, amatista: BASE.amatista, malva: BASE.malva, bruma: BASE.bruma }, '#0c1632')
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const
