import { acentoDe } from '../kit/acento'
/** La paleta de «Botánica», la boda de acuarelas y verde salvia. */
const BASE = {
  papel: '#fafaf6',
  /** El crema de la caligrafía sobre la fotografía: la tinta oscura se la come. */
  crema: '#F5EFE0',
  tinta: '#2a2a26',
  salvia: '#5a705c',
  menta: '#e8efe2',
  lino: '#f4ede0',
  hoja: '#dfe8d8',
  arena: '#f5e8d8',
  oliva: '#d8e0c4',
  durazno: '#fce8d8',
  filete: 'rgba(90,112,92,0.27)',
  fileteSuave: 'rgba(90,112,92,0.2)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('salvia', { salvia: BASE.salvia }, BASE.papel)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
  filete: A.alfa('salvia', 0.27),
  fileteSuave: A.alfa('salvia', 0.2),
} as const

/** La carta de color del código de vestimenta: cinco círculos de paleta neutra. */
export const CARTA_DE_COLOR = ['#2a2a26', '#5a705c', '#a89880', '#d8cdb8', '#f0e8d8'] as const
