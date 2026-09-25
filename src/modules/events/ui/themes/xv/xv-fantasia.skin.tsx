import Image from '@/shared/design/ui/ImagenQueAparece'
import { THEME_ASSETS, themeAsset } from '../assets'
import { DividerOrnamental } from './DividerOrnamental'
import { FantasiaCover } from './FantasiaCover'
import { iconoGala } from './IconosLineaXv'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-fantasia.palette'

type Archivo = (typeof THEME_ASSETS)['xv-fantasia'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {}

/** La piel de «Noche Estrellada». */
export const PIEL: PielXv = {
  fondoBase: '#0c1830',
  // El velo exacto de su maqueta (`invites-1.jsx:1767`). Estaba en rgba(10,20,42,.48).
  velo: 'rgba(8,16,40,.45)',
  // Su fotografía va **fija a la ventana** y su velo sin desenfoque, como en la maqueta:
  // con el velo borroso de la marina, el fondo oscuro se apagaba entero.
  fondoFijo: true,
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-fantasia', 'noche-estrellada-bg.avif')}
      style={{ objectFit: 'cover' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <FantasiaCover
      accent={P.lila}
      bg="#16223d"
      bgAsset={themeAsset('xv-fantasia', 'noche-estrellada-portada.avif')}
      foto={datos.foto}
      envelopeAsset={themeAsset('xv-fantasia', 'sobre-corona-recortado.avif')}
      hint={datos.enter}
      name={datos.name}
      openLabel={datos.openLabel}
      textColor={P.tinta}
      title={`${datos.title} ${datos.anios}`}
    />
  ),
  // Los colores que «Noche Estrellada» reparte distinto de «Bajo el Mar». Su rótulo de
  // anfitriones no va en caligrafía grande: es una línea pequeña en DM Sans.
  piezas: {
    // El «ENVIAR» de su formulario en la maqueta.
    formulario: { boton: '#C9A24A' },
    // El plano como su maqueta: calles del oro del borde y aro del fondo.
    mapaBorde: '#D9B85C',
    mapaAro: '#0c1830',
    // La firma del cierre va con el oro del diseño, no con su tinta clara.
    firma: '#D9B85C',
    // Su tarjeta de la fecha va desnuda: la maqueta no le pone ornamento.
    fechaOrnamento: false,
    // Disco del color del diseño, y sin línea bajo el rótulo del cronograma.
    discoItinerario: 'rgba(217,184,92,.10)',
    discoBorde: '#C9A24A',
    itinerarioSeparador: 'ninguno',
    // Los tres diseños de gala: sombra negra, sin halo, la cita dentro de un panel en
    // serif itálico y el reloj **debajo** del «Faltan», como en su maqueta.
    sombraTexto: '0 2px 8px rgba(0,0,0,.7)',
    haloTitular: 'none',
    cita: {
      panel: true,
      fuente: 'var(--font-cormorant)',
      // Como la maqueta: cursiva de peso normal y sin resplandor.
      weight: 400,
      sombra: 'none',
      color: '#F3EDD8',
      cursiva: true,
      mayusculas: false,
      size: 18,
      interlineado: 2.1,
      espaciado: 'normal',
      opacidad: 1,
      relleno: '44px 28px',
      maxAncho: '72%',
    },
    relojDebajo: true,
    // El código de la mesa de regalos va casi en negro, como en la maqueta: es lo que se lee.
    qrTinta: '#1a1208',
    itinerarioHora: '#F3EDD8',
    itinerarioHoraSize: 20,
    vestimentaNota: '#C9B78A',
    vestimentaDetalle: '#F3EDD8',
    tituloFormulario: '#C9A24A',
    botonTinta: '#0C1830',
    anfitriones: { font: 'var(--font-dm-sans)', size: 12, color: '#C9B78A', mayusculas: true },
    anfitrionesNombres: '#F3EDD8',
    fecha: '#D9B85C',
    tituloSeccion: '#D9B85C',
    lugarNombre: '#F3EDD8',
    mapa: '#D9B85C',
    itinerarioRotulo: '#D9B85C',
    itinerarioRotuloSize: 11,
  },
  // Los tamaños de su maqueta: el ramo y la luna a 260, el reloj a 100.
  arte: { coronaWidth: 260, relojWidth: 100, cierreWidth: '60%' },
  // La recepción lleva un castillo de línea dorado, como en su maqueta.
  castilloNodo: (
    <svg
      aria-hidden
      fill="none"
      height="40"
      stroke="#D9B85C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      style={{ flexShrink: 0 }}
      viewBox="0 0 24 24"
      width="40"
    >
      <path d="M4 21 V10 M20 21 V10 M4 10 L4 7 L7 7 L7 10 M20 10 L20 7 L17 7 L17 10 M7 10 L7 4 L9 6 M17 10 L17 4 L15 6 M9 6 L12 3 L15 6" />
      <path d="M4 21 H20" />
      <rect height="6" width="4" x="10" y="15" />
    </svg>
  ),
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  rotulos: { itinerary: 'itineraryTitle' },
  // La pieza entre la cita y los padres es el ramo, y la luna cierra la invitación: en la
  // maqueta van así, y estaban cruzadas.
  corona: themeAsset('xv-fantasia', 'flores-sin-fondo.avif'),
  reloj: themeAsset('xv-fantasia', 'reloj-dorado-opt.avif'),
  castillo: themeAsset('xv-fantasia', 'sobre-corona-recortado.avif'),
  vestimenta: themeAsset('xv-fantasia', 'tiara-vino-sf.avif'),
  // Su código de vestimenta son dos siluetas de línea, como en la maqueta.
  vestimentaNodo: (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 18 }}>
      <svg aria-hidden fill="none" height="70" stroke="#D9B85C" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24" width="50">
        <path d="M9 3 L9 6 L6 9 L6 20 L18 20 L18 9 L15 6 L15 3 Z" />
        <path d="M9 3 a3 3 0 0 0 6 0" />
      </svg>
      <svg aria-hidden fill="none" height="70" stroke="#D9B85C" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} viewBox="0 0 24 24" width="50">
        <path d="M8 3 L12 6 L16 3 L18 8 L15 9 L15 20 L9 20 L9 9 L6 8 Z" />
      </svg>
    </div>
  ),
  cierre: themeAsset('xv-fantasia', 'luna-estrella-opt.avif'),
  // Su cronograma no lleva fotografías: son trazos dorados, como en la maqueta.
  iconoNodo: (clave) => iconoGala(clave, { color: '#D9B85C' }),
  icono: (clave) => themeAsset('xv-fantasia', ICONOS[clave ?? ''] ?? 'luna-estrella-opt.avif'),
  ornamento: <DividerOrnamental color={P.lila} />,
}
