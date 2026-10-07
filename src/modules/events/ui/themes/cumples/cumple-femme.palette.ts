import { acentoDe } from '../kit/acento'

/** La paleta de «Femme Fatale»: terciopelo granate, oro viejo y crema de tocador. */
const BASE = {
  /** El negro de la portada, para el instante en que el arte todavía no llegó. */
  noche: '#05020a',
  /** Los rótulos y el filete de las tarjetas. */
  oro: '#d8b98a',
  /** El oro de los marcos de las fotos, del botón del mapa y de los «sí». */
  oroViejo: '#c9a96e',
  crema: '#F3E6CC',
  /** El botón de enviar y el del reproductor. */
  vino: '#8C1E32',
  /** El fondo del degradado del vino y del oro: lo que da volumen a las píldoras del RSVP. */
  vinoHondo: '#5A1020',
  oroHondo: '#9C7A46',
  /** La tinta sobre el oro: el texto de los botones llenos. */
  tintaSobreOro: '#1E0A0E',
  /**
   * El vidrio de las tarjetas: granate casi negro. La maqueta lo lleva al 68 %; al 80 %, porque
   * sobre la foto del tocador el texto se perdía (pedido por el usuario, 6 de octubre).
   */
  vidrio: 'rgba(20,6,10,0.80)',
  /** El fondo del plano del mapa: más hondo que las tarjetas, para que las calles y el alfiler se lean. */
  fondoMapa: 'rgba(10,2,5,0.72)',
  filete: 'rgba(216,185,138,0.45)',
  fileteSuave: 'rgba(216,185,138,0.22)',
  fileteEtiqueta: 'rgba(216,185,138,0.55)',
  /** El velo que oscurece el fondo arriba —donde va el titular— y lo deja ver abajo. */
  velo: 'linear-gradient(180deg, rgba(14,3,6,.82) 0%, rgba(14,3,6,.55) 22%, rgba(14,3,6,.15) 45%, rgba(14,3,6,.08) 70%, rgba(14,3,6,.25) 100%)',
  /** El nombre del invitado: blanco marfil, con un destello de oro que lo cruza. */
  blanco: '#FFFBF2',
  destello: '#F3DFA8',
  /** El punto del alfiler del mapa. */
  punto: '#000',
  /** El aro oscuro que separa el marco de las fotos del fondo. */
  aro: 'rgba(14,3,6,.35)',
} as const

/** Gala: la familia del acento, con su valor de siempre de respaldo (`kit/acento.ts`). */
const A = acentoDe('oro', { oro: BASE.oro, oroViejo: BASE.oroViejo }, BASE.noche)
const C = A.colores
export const ACENTO = A.definicion

export const PALETA = {
  ...BASE,
  ...C,
  filete: A.alfa('oro', 0.45),
  fileteSuave: A.alfa('oro', 0.22),
  fileteEtiqueta: A.alfa('oro', 0.55),
} as const
