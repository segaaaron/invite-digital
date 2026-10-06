import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Noche Estrellada» (`wedding-variants-7.jsx`, `WeddingEditorialNavy`):
 * azul marino de medianoche con los cuatro oros de la maqueta, sobre la lluvia de purpurina.
 */
const BASE = {
  /** El azul marino del fondo y del degradado que funde el retrato. */
  marino: '#0a1628',
  /** El oro de los filetes, los aros y los titulares. */
  oro: '#c5963a',
  /** El oro más vivo de los marcos de las tarjetas y el botón de ubicación. */
  oroVivo: '#c5961a',
  /** El oro pálido de los rótulos pequeños. */
  oroPalido: '#d4ad5e',
  /** El oro brillante del reloj del itinerario. */
  oroBrillo: '#d4af37',
  /** El oro de los titulares en caligrafía y del carrusel. */
  oroTitular: '#d4a84b',
  /** El marfil de los rótulos en caligrafía de las tarjetas. */
  marfil: '#fff8e7',
  /** La tinta: blanco. */
  tinta: '#ffffff',
  /** El punto del alfiler del plano. */
  alfiler: '#000000',
  /** V4, legibilidad: el halo azul del texto sobre la purpurina (`.lg-nv`). */
  halo: 'rgba(6,14,30,0.92)',
  /** El velo que oscurece la fotografía bajo el cuerpo, más arriba que abajo. */
  veloCuerpo: 'linear-gradient(180deg, rgba(8,18,36,.6) 0%, rgba(8,18,36,.4) 35%, rgba(8,18,36,.2) 70%, rgba(8,18,36,.15) 100%)',
  /** El velo de la portada detrás de los nombres y la sombra de sus textos. */
  veloPortada: 'rgba(8,18,36,0.7)',
  sombraLegible: '0 0 12px rgba(6,14,30,.95), 0 0 3px rgba(6,14,30,.9)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro, oroVivo: BASE.oroVivo, oroPalido: BASE.oroPalido, oroBrillo: BASE.oroBrillo, oroTitular: BASE.oroTitular }, BASE.marino)
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
  { nombre: 'Negro', color: '#1a1a1a' },
  { nombre: 'Dorado', color: '#c5963a' },
  { nombre: 'Arena', color: '#c8b8a0' },
  { nombre: 'Verde salvia', color: '#7a8c64' },
  { nombre: 'Crema', color: '#f1ede4' },
] as const
