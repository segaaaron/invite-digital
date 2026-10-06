import Image from '@/shared/design/ui/ImagenQueAparece'
import { themeAsset } from '../assets'
import { CronogramaZigzag } from './CronogramasV3'
import { NataliaCover } from './NataliaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-natalia.palette'

/**
 * La piel de «Encanto Marino»: dorado sobre negro, con partitura de fondo.
 *
 * No lleva burbujas —son del mar, no de la música— y su velo es negro al 25 %: sobre una
 * partitura dorada, un velo claro apaga el oro y deja el texto sin contraste por los dos
 * lados.
 */
export const PIEL_NATALIA: PielXv = {
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  // «Lluvia de Sobres» no está: en la maqueta es una tarjeta **dentro** de los regalos, y
  // vive en el contenido de muestra, no como rótulo del libro de firmas.
  rotulos: { itinerary: 'scheduleTitle', gifts: 'giftsEmbrace' },
  // Su maqueta sí pinta «Detalles que Abrazan» con el sobre y el código.
  regalos: true,
  fondoBase: '#120c06',
  velo: 'rgba(0,0,0,.25)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-natalia', 'fondo-notas-dorado.avif')}
      style={{ objectFit: 'cover', objectPosition: '25% 40%' }}
    />
  ),
  burbujas: null,
  // V4 (`.lg-nat`): un halo café oscuro en cada texto y un velo que oscurece el centro.
  halo: 'rgba(20,12,4,0.9)',
  veloCentral: 'linear-gradient(90deg, rgba(14,8,2,0) 0%, rgba(14,8,2,.35) 20%, rgba(14,8,2,.35) 80%, rgba(14,8,2,0) 100%)',
  portada: (datos) => (
    <NataliaCover
      fecha={datos.fecha}
      bgAsset={themeAsset('xv-natalia', 'fondo-musical.avif')}
      hint={datos.enter}
      line1={datos.line1}
      line2={datos.line2}
      name={datos.name}
      noteAsset={themeAsset('xv-natalia', 'nota-sol-dorado-sf.avif')}
      openLabel={datos.openLabel}
      title={`${datos.title} ${datos.anios}`}
    />
  ),
  // Los colores que «Encanto Marino» reparte distinto de «Bajo el Mar», medidos contra su
  // componente de la maqueta.
  piezas: {
    mapaBorde: P.uva,
    mapaAro: P.pinAro,
    mapaRotulo: P.blanco,
    // V3: blanco y oro. Titulares y el nombre en #D4AF37, rótulos en #C5961A, cifras y
    // textos en blanco.
    firma: P.violeta,
    haloTitular: 'radial-gradient(ellipse 70% 75% at 50% 50%, rgba(0,0,0,.5) 0%, rgba(0,0,0,.32) 55%, transparent 80%)',
    haloTitularFiltro: 'blur(6px)',
    veloTexto: 'rgba(0,0,0,.45)',
    cita: { fuente: 'var(--font-cormorant)', cursiva: true, size: 19, weight: 600, interlineado: 1.6, mayusculas: false, espaciado: 'normal', color: P.blanco, opacidad: 1, sombra: 'none' },
    aniosSombra: '0 1px 3px rgba(0,0,0,.65)',
    pestanas: { acento: P.violeta, sobreAcento: P.pinAro, tinta: P.blanco, borde: P.uva, sombra: '0 2px 8px rgba(0,0,0,.7)' },
    lugarHoraLetra: 'var(--font-dm-sans)',
    verUbicacion: { borde: P.uva, tinta: P.violeta },
    fechaFiletes: true,
    // El código de la mesa de regalos va casi en negro, como en la maqueta: es lo que se lee.
    qrTinta: '#1a1208',
    qrAro: P.lila,
    regalosIntro: P.blanco,
    sobresRotulo: P.violeta,
    sobresNota: P.blanco,
    serial: P.uva,
    monograma: P.blanco,
    anios: P.blanco,
    nombre: P.violeta,
    anfitrionesNombres: P.blanco,
    fecha: P.blanco,
    rotuloTenue: P.uva,
    faltan: P.violeta,
    lugarNombre: P.blanco,
    lugarDireccion: P.blanco,
    lugarHora: P.blanco,
    recepcionFilete: P.fileteTenue,
    mapa: P.uva,
    musicaAcento: P.uva,
    musicaPista: P.oroClaro,
    musicaArtista: P.uva,
    vestimentaNota: P.uva,
    vestimentaDetalle: P.blanco,
    despedida: P.blanco,
    // V3 quitó las sombras blancas del texto; el nombre conserva la suya y la bendición
    // lleva una más tenue, con el halo claro detrás.
    sombraTexto: 'none',
    sombraNombre: '0 2px 12px rgba(20,12,4,.9), 0 0 3px rgba(20,12,4,.8)',
    // V4: la bendición sobre un velo café oscuro, no sobre el halo claro.
    sombraBendicion: '0 1px 2px rgba(0,0,0,.85), 0 0 10px rgba(20,10,2,.7)',
    haloCierre: 'radial-gradient(ellipse 72% 70% at 50% 40%, rgba(22,12,4,.82) 0%, rgba(22,12,4,.6) 45%, transparent 78%)',
    invitadoTitulo: P.blanco,
    plazo: P.blanco,
    // El formulario dorado de la maqueta (`SofiaRSVPForm` sin tema).
    botonTinta: '#1a1208',
    formulario: {
      boton: P.uva,
      campo: P.campo,
      linea: P.uva,
      tinta: P.blanco,
      etiqueta: P.violeta,
      marcador: P.bruma,
      filete: P.uva,
      panel: P.cafe,
      hueco: P.cafe,
    },
  },
  // V4: el brindis de dos copas con su nota musical, a línea de oro, en la recepción.
  castilloNodo: (
    <svg aria-hidden fill="none" height="48" stroke={P.violeta} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" style={{ flexShrink: 0 }} viewBox="0 0 48 48" width="48">
      <path d="M9 17 L17 15 L18.5 23 Q19 27 15.5 28.2 Q12 29.2 10.8 25.4 Z" />
      <path d="M14 28.4 L15.6 38" />
      <path d="M11.8 38.6 L19.4 37.4" />
      <path d="M39 17 L31 15 L29.5 23 Q29 27 32.5 28.2 Q36 29.2 37.2 25.4 Z" />
      <path d="M34 28.4 L32.4 38" />
      <path d="M36.2 38.6 L28.6 37.4" />
      <path d="M10 20.5 L18 18.6" />
      <path d="M38 20.5 L30 18.6" />
      <path d="M22 12 L23 14" />
      <path d="M26 12 L25 14" />
      <path d="M24 10.5 L24 13" />
      <path d="M26.6 9.2 L26.6 3.2 L30.4 2.4 L30.4 7.6" />
      <ellipse cx="25.5" cy="9.4" rx="1.6" ry="1.2" />
      <ellipse cx="29.3" cy="7.8" rx="1.6" ry="1.2" />
    </svg>
  ),
  // El cronograma en zigzag de V3, sin tarjeta.
  itinerario: (filas) => <CronogramaZigzag acento={P.uva} filas={filas} fondo={P.fondoRombo} hora={P.blanco} />,
  arte: { castilloWidth: 48, vestimentaWidth: '70%' },
  // Como en su maqueta: la partitura va fija a la ventana y sin velo borroso, no hay
  // burbujas —son del mar, no de la música— y lo que flota son notas doradas.
  fondoFijo: true,
  particulas: { char: '♪', color: P.uva, count: 14 },
  // V4: el cierre es solo la bendición del final.
  cierreSoloBendicion: true,
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  corona: themeAsset('xv-natalia', 'guitarra-y-saxo-dorado-sf.avif'),
  reloj: themeAsset('xv-natalia', 'nota-sol-sf.avif'),
  castillo: themeAsset('xv-natalia', 'castillo-purpura.avif'),
  vestimenta: themeAsset('xv-natalia', 'vestimenta-v4.avif'),
  cierre: themeAsset('xv-natalia', 'instrumentos-sf.avif'),
  // El zigzag no pinta iconos; el esqueleto pide uno igual.
  icono: () => themeAsset('xv-natalia', 'nota-sol-sf.avif'),
}
