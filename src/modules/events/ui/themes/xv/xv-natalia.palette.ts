/**
 * La paleta de «Encanto Musical» (Natalia) en V3: blanco y oro sobre cristal café.
 *
 * Mismos nombres de color que la marina para que las dos pieles encajen en el mismo
 * esqueleto: lo que en una es lila, aquí es oro. El cristal lleva un brillo dorado arriba
 * sobre café translúcido, porque debajo hay una partitura dorada.
 */
export const PALETA = {
  tinta: '#ffffff',
  orquidea: '#c5961a',
  uva: '#c5961a',
  amatista: '#c5961a',
  /** Los titulares en caligrafía: «Cronograma», «Faltan», el nombre. */
  violetaHondo: '#d4af37',
  violeta: '#d4af37',
  malva: '#c5961a',
  bruma: '#999999',
  lila: '#c5961a',
  lilaFuerte: '#c5961a',
  blanco: '#ffffff',
  /** La pista del reproductor, un oro más claro. */
  oroClaro: '#e8c88f',
  /** El cristal plano, para lo que no admite degradado (los campos y las tarjetas de las ranuras). */
  cafe: 'rgba(44,26,14,.72)',
  campo: '#1a1a1a',
  /** El filete bajo la dirección de la recepción. */
  fileteTenue: 'rgba(197,150,26,.27)',
  /** El fondo que corta la línea del cronograma en cada rombo. */
  fondoRombo: '#241408',
  pinAro: '#2c1a0e',
  vidrio: 'radial-gradient(120% 100% at 50% 0%, rgba(197,150,26,.16), transparent 60%), rgba(44,26,14,.72)',
  vidrioFuerte: 'radial-gradient(120% 100% at 50% 0%, rgba(197,150,26,.16), transparent 60%), rgba(44,26,14,.72)',
  bordeVidrio: '#c5961a',
  sombra: '0 4px 20px rgba(197,150,26,.12)',
  sombraFuerte: '0 4px 20px rgba(197,150,26,.18)',
} as const
