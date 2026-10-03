import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Palacio Griego» (Isabelle, V3): oro viejo y pardo sobre mármol crema.
 *
 * Con los nombres de color de la piel marina, para encajar en el esqueleto compartido.
 */
const BASE = {
  tinta: '#5c4033',
  orquidea: '#8b6914',
  uva: '#8b6914',
  /** Las calles del plano y el acento del reproductor: el verde oliva de la maqueta. */
  amatista: '#808a5c',
  violetaHondo: '#3c2a14',
  violeta: '#8b6914',
  malva: '#6b5b4e',
  bruma: '#9b8a7a',
  lila: '#c5961a',
  lilaFuerte: '#c5961a',
  blanco: '#ffffff',
  crema: '#fff8e7',
  vidrio: 'rgba(255,248,231,.85)',
  vidrioFuerte: 'rgba(255,248,231,.85)',
  bordeVidrio: '#c5961a',
  sombra: '0 6px 22px rgba(139,105,20,.15)',
  sombraFuerte: '0 6px 22px rgba(139,105,20,.15)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('orquidea', { orquidea: BASE.orquidea, uva: BASE.uva, violeta: BASE.violeta, lila: BASE.lila, lilaFuerte: BASE.lilaFuerte, bordeVidrio: BASE.bordeVidrio, amatista: BASE.amatista, malva: BASE.malva }, BASE.crema)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
  sombra: `0 6px 22px ${A.alfa('orquidea', 0.15)}`,
  sombraFuerte: `0 6px 22px ${A.alfa('orquidea', 0.15)}`,
} as const
