/**
 * La paleta de «Esencia», la boda de lino y olivo (`esencia.jsx`).
 *
 * Son los mismos colores que declara la maqueta en su cabecera —`ink`, `sub`, `gold`,
 * `goldBorder`, `line`, `goldLight`, `warm`, `paper`—, con su nombre en castellano.
 */
export const PALETA = {
  /** `paper`: el lino del fondo. */
  papel: '#faf7f2',
  /** `warm`: el papel un punto más cálido de las cajas de la cuenta atrás. */
  calido: '#f0eae0',
  /** `ink`: la tinta de los titulares. */
  tinta: '#2c2820',
  /** `sub`: la tinta secundaria, para los rótulos y los párrafos. */
  tintaSuave: '#7a756c',
  /** `gold`: el oro de los filetes, los rótulos pequeños y los iconos. */
  oro: '#b8956a',
  /** `goldBorder`: el oro de las ramas de olivo y de los filetes de las cajas. */
  oroBorde: '#c4a882',
  /** `goldLight`: el oro pálido de la línea del itinerario. */
  oroClaro: '#e8dece',
  /** `line`: el filete neutro de los campos y los botones. */
  filete: '#ddd8ce',
} as const

/** Los cuatro colores del código de vestimenta, con su nombre, como los pinta la maqueta. */
export const CARTA_DE_COLOR = [
  { nombre: 'Negro', color: '#1a1a18' },
  { nombre: 'Dorado', color: '#b8956a' },
  { nombre: 'Marfil', color: '#f0eae0' },
  { nombre: 'Verde olivo', color: '#8b9080' },
] as const
