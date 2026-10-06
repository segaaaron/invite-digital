import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Glamour» (`wedding-variants.jsx`, `WeddingBotanical`): guinda profundo con
 * oro y marfil, y el rosa viejo de la portada.
 */
const BASE = {
  /** El guinda del fondo. */
  guinda: '#3a0015',
  /** El oro de los rótulos, los filetes y los titulares en caligrafía. */
  oro: '#c5963a',
  /** La tinta: crema. */
  crema: '#f5efe0',
  /** El marfil de las cifras, los filetes de las tarjetas y los botones. */
  marfil: '#faf3e0',
  /** El rosa viejo del filete de la portada y su llamada. */
  rosa: '#b76e79',
  /** El blanco cálido del rótulo de la portada. */
  blancoCalido: '#fff8e7',
  /** El punto del alfiler del plano. */
  alfiler: '#000000',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro }, BASE.guinda)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const
