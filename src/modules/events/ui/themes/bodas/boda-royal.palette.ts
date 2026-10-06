import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Royal Blush» (`wedding-variants-6.jsx`, `WeddingEditorialRoyalBlush`):
 * rosa palo y borgoña con oro viejo, sobre la fotografía del palacio.
 */
const BASE = {
  /** El rosa del degradado que funde la fotografía con la página. */
  rosa: '#f5d6d0',
  /** El rosa más claro de las cajas. */
  rosaClaro: '#fff0ed',
  /** El borgoña de los titulares. */
  borgona: '#8b2252',
  /** El borgoña oscuro de los números y los rótulos fuertes. */
  borgonaHondo: '#6b1a3a',
  /** La tinta de los párrafos. */
  tinta: '#4a1a2e',
  /** El oro de los filetes. */
  oro: '#996515',
  /** El oro claro de los botones y los aros de los iconos. */
  oroClaro: '#b8860b',
  /** El oro sombrío de los rótulos pequeños. */
  oroHondo: '#7a5c28',
  /** El azul de la línea de nombres bajo la cabecera, que la maqueta hereda de su hermana. */
  medio: '#3a5a8c',
  /** V4: la tinta más honda de los párrafos largos. */
  tintaHonda: '#341220',
  /** El punto del alfiler del plano. */
  alfiler: '#000000',
  /** V4, legibilidad: el halo rosado del texto sobre la fotografía (`.lg-rb`). */
  halo: 'rgba(255,243,240,0.95)',
  /** El velo que aclara la fotografía bajo el cuerpo: más claro al centro y arriba y abajo. */
  veloCuerpo:
    'linear-gradient(90deg, rgba(250,230,228,0) 0%, rgba(250,230,228,.6) 16%, rgba(250,230,228,.6) 84%, rgba(250,230,228,0) 100%), linear-gradient(180deg, rgba(250,230,228,.35) 0%, transparent 30%, transparent 75%, rgba(250,230,228,.35) 100%)',
  /** El velo de la portada detrás de los nombres y la sombra de sus textos. */
  veloPortada: 'rgba(255,238,234,0.78)',
  sombraLegible: '0 1px 2px rgba(90,25,45,.45), 0 0 10px rgba(255,240,236,.9)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('borgona', { borgona: BASE.borgona, borgonaHondo: BASE.borgonaHondo }, BASE.rosaClaro)
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
  { nombre: 'Dorado', color: '#996515' },
  { nombre: 'Arena', color: '#c8b8a0' },
  { nombre: 'Rosa Palo', color: '#e8b4b8' },
  { nombre: 'Crema', color: '#f1ede4' },
] as const
