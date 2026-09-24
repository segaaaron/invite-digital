/** La paleta de «Editorial» (V3): verde botánico de fondo con oro sobre él. */
export const PALETA = {
  /** El velo verde que va sobre la fotografía de fondo y bajo todo lo demás. */
  fondo: '#16281c',
  oro: '#D4B678',
  oroClaro: '#D8BE84',
  papel: '#F5EFE0',
  papelClaro: '#F8F4EA',
  crema: '#f1ede4',
  hueso: '#EDE6D3',
  velo: 'rgba(10,25,15,0.35)',
  veloHoja: 'rgba(10,20,14,0.35)',
  oroPalido: '#E8D5A8',
  papelSuave: 'rgba(245,239,224,0.82)',
  /** Los aros de la cuenta atrás, lleno y de fondo, y su cifra. */
  aro: '#C5961A',
  aroFondo: 'rgba(197,150,26,0.25)',
  blanco: '#FFFFFF',
  /** El camino punteado del itinerario y sus flores. */
  camino: '#C9A961',
  fileteSuave: 'rgba(212,182,120,0.25)',
} as const

/**
 * La carta de color del código de vestimenta: cinco muestras con su nombre.
 *
 * Es del diseño y no del contenido —quien la elige es el diseño, no el atelier—, así que
 * vive con la paleta. La maqueta dejó de enseñar el hexadecimal debajo de cada muestra.
 */
export const CARTA_DE_COLOR = [
  { color: '#1a1a1a', nombre: 'Negro' },
  { color: '#D4B678', nombre: 'Dorado' },
  { color: '#c8b8a0', nombre: 'Arena' },
  { color: '#7a8c64', nombre: 'Verde salvia' },
  { color: '#f1ede4', nombre: 'Crema' },
] as const
