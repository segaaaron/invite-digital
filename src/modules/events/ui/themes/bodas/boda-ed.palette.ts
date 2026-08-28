/** La paleta de «Editorial», la boda como número de revista. */
export const PALETA = {
  papel: '#f1ede4',
  tinta: '#1a1a1a',
  terra: '#aa6e4e',
  crema: '#f6ece0',
  arena: '#e8dfd0',
  arcilla: '#ead8c8',
  durazno: '#e8c8a8',
  filete: 'rgba(26,26,26,0.15)',
  fileteMedio: 'rgba(26,26,26,0.2)',
  fileteFuerte: 'rgba(26,26,26,0.25)',
} as const

/**
 * La carta de color del código de vestimenta, que el diseño pinta como muestrario de
 * revista: cinco cuadrados con su nombre y su hexadecimal **a la vista**.
 *
 * El hexadecimal se enseña como texto a propósito: es lo que hace que se lea como una
 * página de moda y no como cinco cuadrados de colores.
 */
export const CARTA_DE_COLOR = [
  { color: '#1a1a1a', nombre: 'Onyx' },
  { color: '#aa6e4e', nombre: 'Terra' },
  { color: '#c8b8a0', nombre: 'Sand' },
  { color: '#7a8c64', nombre: 'Sage' },
  { color: '#f1ede4', nombre: 'Cream' },
] as const
