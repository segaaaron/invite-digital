import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Esencia», la boda de lino y olivo (`esencia.jsx`).
 *
 * Son los mismos colores que declara la maqueta en su cabecera —`ink`, `sub`, `gold`,
 * `goldBorder`, `line`, `goldLight`, `warm`, `paper`—, con su nombre en castellano.
 */
const BASE = {
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
  /** El gris de la fecha y del rótulo de la portada. */
  gris: '#8a8279',
  /** V4: la tinta de las líneas del itinerario. */
  tintaItinerario: '#6b5e4e',
  /** El sobre de la portada V4: su fondo, la carta, el frente, la solapa y el lacre. */
  sobre: '#ede3d2',
  carta: '#fdfbf7',
  frenteSobre: '#f3ebdd',
  solapa: '#f0e6d5',
  filoSolapa: 'rgba(184,150,106,0.45)',
  brilloSobre: 'linear-gradient(160deg, rgba(0,0,0,0.035), transparent 55%)',
  lacreClaro: '#dcc293',
  lacreOscuro: '#957548',
  sombraSobre: 'rgba(60,45,25,0.22)',
  sombraDelSobre: '0 22px 44px rgba(60,45,25,0.18), 0 4px 10px rgba(60,45,25,0.08), inset 0 0 0 1px rgba(184,150,106,0.22)',
  sombraSolapa: 'rgba(60,45,25,0.12)',
  sombraLacre: '0 3px 8px rgba(80,55,20,0.3), inset 0 0 0 3px rgba(255,255,255,0.12)',
  /** El velo oscuro de la fotografía en paralaje y el blanco de su frase. */
  veloFoto: 'rgba(30,24,16,0.34)',
  blanco: '#ffffff',
  /** La caja de los datos del banco, sobre el lino. */
  papelVelado: 'rgba(250,247,242,0.6)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro, oroBorde: BASE.oroBorde, oroClaro: BASE.oroClaro }, BASE.papel)
const C = A.colores
export const ACENTO = A.definicion
export const alfaDe = A.alfa
export const colorDeAcento = C

export const PALETA = {
  ...BASE,
  ...C,
} as const

/** Los cuatro colores del código de vestimenta, con su nombre, como los pinta la maqueta. */
export const CARTA_DE_COLOR = [
  { nombre: 'Negro', color: '#1a1a18' },
  { nombre: 'Dorado', color: '#b8956a' },
  { nombre: 'Marfil', color: '#f0eae0' },
  { nombre: 'Verde olivo', color: '#8b9080' },
] as const
