import { acentoDe } from '../kit/acento'
/** La paleta de «Papillon» (Emilia, `xv-papillon.jsx`): jardín rosa, mariposas y oro. */
const BASE = {
  rosa: '#E8B4B8',
  rosaHonda: '#C9929A',
  rosaSuave: 'rgba(242,209,213,0.55)',
  crema: '#FDF8F3',
  oro: '#B8953A',
  oroClaro: '#E0D5B7',
  salvia: '#A8B5A0',
  tinta: '#4A3F3A',
  tintaSuave: '#8A7E78',
  /** La hora del itinerario y el rótulo de las muestras de color. */
  ciruela: '#5A4550',
  gris: '#9A8A90',
  blanco: '#FFFFFF',
  /** El rosa de debajo de las mariposas, mientras cargan. */
  fondo: '#F8E0E4',
  /** El cristal esmerilado de todas las tarjetas. */
  cristal: 'rgba(255,245,248,0.4)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro, oroClaro: BASE.oroClaro }, BASE.crema)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const

/** La carta de color del código de vestimenta, como la maqueta. */
export const CARTA_DE_COLOR = [
  { color: '#F2D1D5', nombre: 'Rosa' },
  { color: '#D4C5B9', nombre: 'Champagne' },
  { color: '#C5A55A', nombre: 'Dorado' },
  { color: '#A8B5A0', nombre: 'Salvia' },
] as const
