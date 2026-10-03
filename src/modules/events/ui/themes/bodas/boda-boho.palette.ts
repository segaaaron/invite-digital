import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Pampas y Flores Secas» (`wedding-variants-10.jsx`, `WeddingBohoPampas`):
 * terracota, café y crema sobre la fotografía de pampas.
 */
const BASE = {
  /** El terracota de los botones. */
  terracota: '#b8795a',
  /** El café de toda la tinta. */
  cafe: '#5c4033',
  /** El café más hondo del «no» del RSVP. */
  cafeHondo: '#4a3320',
  /** El crema del fondo y de los nombres sobre el retrato. */
  crema: '#f5ead9',
  /** El oro de los filetes y los marcos. */
  oro: '#c9a96e',
  /** El beige de la línea «nos casamos». */
  beige: '#e4c9a8',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('terracota', { terracota: BASE.terracota, oro: BASE.oro, beige: BASE.beige }, BASE.crema)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const

/** Los cinco colores del código de vestimenta, con su nombre, como los pinta la maqueta. */
export const CARTA_DE_COLOR = [
  { nombre: 'Terracota', color: '#8c6a4f' },
  { nombre: 'Arena', color: '#c8a876' },
  { nombre: 'Beige', color: '#e4c9a8' },
  { nombre: 'Café', color: '#5a3e2b' },
  { nombre: 'Crema', color: '#f5ead9' },
] as const
