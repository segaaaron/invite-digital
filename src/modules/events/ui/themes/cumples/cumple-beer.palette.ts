import { acentoDe } from '../kit/acento'
/** La paleta de «Cervecería Vintage»: madera, oro de cebada y crema de espuma. */
const BASE = {
  /** La madera del barril: el fondo de arriba. */
  madera: '#1c140c',
  /** El fondo del degradado, un punto más claro: la taberna se aclara hacia abajo. */
  maderaClara: '#241a10',
  oro: '#d4a94b',
  crema: '#f3e0b8',
  /** Los filetes de las tarjetas y del mapa. */
  filete: 'rgba(212,169,75,0.4)',
  fileteSuave: 'rgba(212,169,75,0.35)',
  /** El velo de las tarjetas: oro al 5 %, que es el vidrio de este diseño. */
  vidrio: 'rgba(212,169,75,0.05)',
  vidrioFuerte: 'rgba(212,169,75,0.06)',
  /** Las duelas verticales sobre el fondo, que es lo que lo hace madera y no marrón. */
  duelas: 'rgba(0,0,0,0.15)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro }, BASE.madera)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
  filete: A.alfa('oro', 0.4),
  fileteSuave: A.alfa('oro', 0.35),
  vidrio: A.alfa('oro', 0.05),
  vidrioFuerte: A.alfa('oro', 0.06),
} as const
