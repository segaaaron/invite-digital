import { acentoDe } from '../kit/acento'
/**
 * La paleta de «Marco Perlado» (`wedding-variants-8.jsx`, `WeddingEditorialPearl`): marfil y
 * perla con oro viejo, sobre el marco de flores blancas.
 */
const BASE = {
  /** El marfil del fondo, detrás del marco. */
  marfil: '#ede0c8',
  /** El oro pálido de los filetes y los marcos. */
  perla: '#d4b678',
  /** El oro de los botones. */
  oroBoton: '#b8860b',
  /** El oro oliva de los rótulos pequeños. */
  oliva: '#7a6428',
  /** El oro sombrío de la capitular y la firma de la frase. */
  bronce: '#8b7332',
  /** El café casi negro de los titulares y las cifras. */
  cafe: '#2c1810',
  /** La tinta de los párrafos. */
  tinta: '#3d2b1a',
  /** La tinta del cuerpo. */
  cuerpo: '#4a3320',
  /** El guinda de la frase, la nota de vestimenta y «solo adultos». */
  guinda: '#4a1a2e',
  /** El guinda vivo del rótulo «solo para adultos». */
  guindaVivo: '#8b2252',
  /** El fundido oscuro bajo el retrato. */
  sombra: '#3a2a18',
  /** El crema de los nombres sobre el retrato. */
  crema: '#f1ede4',
  /** El oro claro de la línea «nos casamos». */
  oroClaro: '#e8d5a8',
  /** V4: la tinta más honda de los párrafos largos. */
  tintaHonda: '#2b1e12',
  guindaHondo: '#341220',
  /** La invitación personal, sobre su caja blanca. */
  tintaInvitacion: '#1f1f1f',
  blanco: '#ffffff',
  /** El punto del alfiler del plano. */
  alfiler: '#000000',
  /** V4, legibilidad: el halo marfil del texto sobre el marco de flores (`.lg-pe`). */
  halo: 'rgba(250,244,232,0.95)',
  /** El velo que aclara el centro de la fotografía bajo el cuerpo. */
  veloCuerpo: 'linear-gradient(90deg, rgba(248,242,230,0) 0%, rgba(248,242,230,.5) 18%, rgba(248,242,230,.5) 82%, rgba(248,242,230,0) 100%)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('perla', { perla: BASE.perla, oliva: BASE.oliva, oroBoton: BASE.oroBoton, bronce: BASE.bronce, oroClaro: BASE.oroClaro }, BASE.marfil)
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
  { nombre: 'Dorado', color: '#d4b678' },
  { nombre: 'Arena', color: '#c8b8a0' },
  { nombre: 'Verde salvia', color: '#7a8c64' },
  { nombre: 'Crema', color: '#f1ede4' },
] as const
