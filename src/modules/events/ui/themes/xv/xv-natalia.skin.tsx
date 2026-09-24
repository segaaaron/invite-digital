import Image from 'next/image'
import { themeAsset } from '../assets'
import { CronogramaZigzag } from './CronogramasV3'
import { rotuloDePortada } from './cover-copy'
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
  portada: (datos) => (
    <NataliaCover
      badge={rotuloDePortada(datos.eyebrow, datos.name)}
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
    cita: { size: 15, color: P.blanco, opacidad: 1, sombra: 'none' },
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
    sombraNombre: '0 2px 10px rgba(255,255,255,.7)',
    sombraBendicion: '0 2px 8px rgba(255,255,255,.3)',
    haloCierre: 'radial-gradient(ellipse 70% 65% at 50% 45%, rgba(255,252,255,.5) 0%, transparent 75%)',
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
  // La casita de línea de la recepción (V3), en blanco con el tejado y las ventanas en oro.
  castilloNodo: (
    <svg aria-hidden fill="none" height="48" style={{ flexShrink: 0 }} viewBox="0 0 48 48" width="48">
      <rect height="20" stroke={P.blanco} strokeWidth="1.6" width="32" x="8" y="20" />
      <path d="M6 20 L24 8 L42 20" stroke={P.uva} strokeLinejoin="round" strokeWidth="1.8" />
      <rect height="10" stroke={P.blanco} strokeWidth="1.4" width="8" x="20" y="30" />
      <rect height="6" stroke={P.uva} strokeWidth="1.2" width="5" x="11" y="25" />
      <rect height="6" stroke={P.uva} strokeWidth="1.2" width="5" x="32" y="25" />
      <line stroke={P.uva} strokeWidth="1.4" x1="24" x2="24" y1="8" y2="3" />
      <circle cx="24" cy="2" fill={P.uva} r="1.4" />
    </svg>
  ),
  // El cronograma en zigzag de V3, sin tarjeta.
  itinerario: (filas) => <CronogramaZigzag acento={P.uva} filas={filas} fondo={P.fondoRombo} hora={P.blanco} />,
  arte: { castilloWidth: 48, vestimentaWidth: '70%' },
  // Como en su maqueta: la partitura va fija a la ventana y sin velo borroso, no hay
  // burbujas —son del mar, no de la música— y lo que flota son notas doradas.
  fondoFijo: true,
  particulas: { char: '♪', color: P.uva, count: 14 },
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
  vestimenta: themeAsset('xv-natalia', 'traje-y-vestido.avif'),
  cierre: themeAsset('xv-natalia', 'instrumentos-sf.avif'),
  // El zigzag no pinta iconos; el esqueleto pide uno igual.
  icono: () => themeAsset('xv-natalia', 'nota-sol-sf.avif'),
}
