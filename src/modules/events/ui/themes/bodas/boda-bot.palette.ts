import { acentoDe } from '../kit/acento'
/** La paleta de «Botánica», la boda de acuarelas y verde salvia. */
const BASE = {
  /** El marfil de la maqueta V5 (`#f7f5ee`). */
  papel: '#f7f5ee',
  /** El crema de la caligrafía sobre la fotografía: la tinta oscura se la come. */
  crema: '#F5EFE0',
  tinta: '#2a2a26',
  salvia: '#5a705c',
  /** El verde hondo del itinerario de la maqueta (titular, filete de rombo y dibujos de línea). */
  bosque: '#2c4a3e',
  /** El texto de cuerpo de la maqueta. */
  texto: '#3a4a3c',
  /** La frase en cursiva bajo las rosas. */
  frase: '#344035',
  /** Los filetes de la hoja de calendario. */
  linea: '#c8d4c0',
  /** El borde de las tarjetas de ceremonia, recepción y fotos. */
  borde: '#d8e0d2',
  /** La franja de la mesa de regalos. */
  franja: '#f1f4ee',
  blanco: '#ffffff',
  negro: '#111111',
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
export const CARTA_DE_COLOR = ['#1c1c1c', '#5a705c', '#a1906f', '#cfc3a4', '#eee6d4'] as const
