/**
 * La paleta de «Royal Blush» (`wedding-variants-6.jsx`, `WeddingEditorialRoyalBlush`):
 * rosa palo y borgoña con oro viejo, sobre la fotografía del palacio.
 */
export const PALETA = {
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
} as const

/** Los cinco colores del código de vestimenta, con su nombre, como los pinta la maqueta. */
export const CARTA_DE_COLOR = [
  { nombre: 'Negro', color: '#1a1a1a' },
  { nombre: 'Dorado', color: '#996515' },
  { nombre: 'Arena', color: '#c8b8a0' },
  { nombre: 'Rosa Palo', color: '#e8b4b8' },
  { nombre: 'Crema', color: '#f1ede4' },
] as const
