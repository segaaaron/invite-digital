import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { ValeriaCover } from './ValeriaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-valeria.palette'

type Archivo = (typeof THEME_ASSETS)['xv-valeria'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {
  recepcion: 'bienvenida-guindo-round.avif',
  cena: 'menu-guindo-round.avif',
  baile: 'baile-guindo-round.avif',
  torta: 'torta-guinda-round.avif',
  cierre: 'cierre-guinda-round.avif',
}

/** La piel de «Gala Real». */
export const PIEL: PielXv = {
  // Lo que este diseño abre a sangre, antes de la barra: como en la maqueta.
  apertura: (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '45vh',
          minHeight: 280,
          overflow: 'hidden',
          clipPath: 'polygon(0 0, 100% 0, 100% 94%, 75% 100%, 50% 94%, 25% 100%, 0 94%)',
        }}
      >
        <Image
          alt=""
          fill
          priority
          sizes="480px"
          src={themeAsset('xv-valeria', 'xv-guindo-photo.avif')}
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      </div>
    </>
  ),
  fondoBase: '#2b050c',
  velo: 'rgba(45,10,22,.48)',
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
      src={themeAsset('xv-valeria', 'fondo-vino-guindo-bg.avif')}
      style={{ objectFit: 'cover' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <ValeriaCover
      accent={P.lila}
      bg="#3a0e1c"
      bgAsset={themeAsset('xv-valeria', 'marco-guindo-portada.avif')}
      foto={datos.foto}
      hint={datos.enter}
      name={datos.name}
      openLabel={datos.openLabel}
      textColor={P.tinta}
      tiaraAsset={themeAsset('xv-valeria', 'tiara-vino-sf.avif')}
      title={`${datos.title} AÑOS`}
    />
  ),
  // Los colores que «Gala Real» reparte distinto de «Bajo el Mar». Su rótulo de anfitriones
  // no va en caligrafía grande: es una línea pequeña en DM Sans.
  piezas: {
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
      // Marfil, como `body` en su maqueta. Sin color caía a `uva`, que aquí es el oro.
      color: P.tinta,
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
    qrTinta: '#2a1140',
    itinerarioHora: '#F3EDD8',
    anfitriones: { font: 'var(--font-dm-sans)', size: 12, color: '#C9B78A' },
    anfitrionesNombres: '#F3EDD8',
    fecha: '#D9B85C',
    tituloSeccion: '#D9B85C',
    lugarNombre: '#F3EDD8',
    mapa: '#D9B85C',
    itinerarioRotulo: '#D9B85C',
  },
  // Los tamaños de su maqueta: el candelabro a 260, el castillo a 90, el traje a 90 y la
  // corona de plata del cierre a 200.
  arte: { coronaWidth: 260, relojWidth: 100, castilloWidth: 90, vestimentaWidth: 90, cierreWidth: 200 },
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  rotulos: { itinerary: 'Itinerario' },
  // Su itinerario abre la rejilla **sin** la línea vertical, y estira la quinta fila
  // a las dos columnas para que «Cierre» quede centrado (`invites-1.jsx:2075, 2083`).
  itinerarioDivisoria: false,
  itinerarioUltimaCentrada: true,
  corona: themeAsset('xv-valeria', 'candelabro-guindo-sf.avif'),
  // Sin retrato en arco: su maqueta abre con esa misma fotografía a sangre, y repetirla
  // dentro del arco rosa de la marina la enseñaba dos veces.
  reloj: themeAsset('xv-valeria', 'reloj-plata-opt.avif'),
  castillo: themeAsset('xv-valeria', 'castillo-guindo-opt.avif'),
  vestimenta: themeAsset('xv-valeria', 'traje1-opt.avif'),
  cierre: themeAsset('xv-valeria', 'corona-plata-opt.avif'),
  icono: (clave) => themeAsset('xv-valeria', ICONOS[clave ?? ''] ?? 'bienvenida-guindo-round.avif'),
  iconoRedondo: true,
}
