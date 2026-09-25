import Image from '@/shared/design/ui/ImagenQueAparece'
import { THEME_ASSETS, themeAsset } from '../assets'
import { MarianaCover } from './MarianaCover'
import { TortaDePlata } from './TortaDePlata'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-mariana.palette'

type Archivo = (typeof THEME_ASSETS)['xv-mariana'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {
  recepcion: 'sobre-plata-opt.avif',
  cena: 'menu-plata-opt.avif',
  baile: 'baile-plata-opt.avif',
  // «Cierre», no «Despedida»: es como lo llama su maqueta.
  cierre: 'auto-plata-opt.avif',
}

/** La piel de «Noche Disco» (Mariana). */
export const PIEL: PielXv = {
  // Su itinerario es una sola columna centrada (`invites-1.jsx`, «Itinerario»).
  itinerarioColumna: true,
  // Lo que este diseño abre a sangre, antes de la barra: como en la maqueta.
  apertura: (
    <>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(var(--alto, 100dvh) * 0.42)',
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
          src={themeAsset('xv-mariana', 'bola-sola-opt.avif')}
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      </div>
      <Image
        alt=""
        aria-hidden
        height={510}
        src={themeAsset('xv-mariana', 'borde-plata-sf.avif')}
        style={{ width: '60%', height: 'auto', display: 'block', margin: '18px auto 0', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.6))' }}
        width={1400}
      />
    </>
  ),
  // Negro. Estaba en `#0c1830`, que es el azul noche de «Noche Estrellada»: en la maqueta
  // este diseño no pone color de fondo al artículo, y lo que se ve detrás es negro.
  fondoBase: '#000000',
  // El velo de su maqueta es negro puro al 40 %, no un azulado al 48: con el azul, la
  // plata de las bolas de discoteca salía fría y con menos contraste.
  velo: 'rgba(0,0,0,.4)',
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
      // Su maqueta pinta **`fondo-disco-tacones`**, no `fondo-disco-mariana`
      // (`invites-1.jsx:2232`). Los dos están en el repositorio y se cogió el otro: por eso
      // el fondo no era el del diseño. Y va anclado al 20 % de altura, que es lo que deja
      // la bola de discoteca arriba en vez de partida por el medio.
      src={themeAsset('xv-mariana', 'fondo-disco-tacones-opt.avif')}
      style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <MarianaCover
      accent={P.lila}
      bg="#050608"
      bgAsset={themeAsset('xv-mariana', 'fondo-disco-mariana-opt.avif')}
      foto={datos.foto}
      hint={datos.enter}
      name={datos.name}
      nameColor={P.blanco}
      openLabel={datos.openLabel}
      title={`${datos.title} ${datos.anios}`}
      titleGradient="linear-gradient(180deg, #FFFFFF 0%, #D8DDE3 60%)"
    />
  ),
  // Los colores que «Encanto Musical» reparte distinto de «Bajo el Mar». Su «XV» no es un
  // color: es un degradado de plata recortado sobre el texto, como el material del diseño.
  piezas: {
    // El «ENVIAR» de su formulario en la maqueta.
    formulario: { boton: '#C0C6CD' },
    botonTinta: '#000000',
    // El plano como su maqueta: aro negro, rótulo y coordenadas en plata.
    mapaAro: '#000000',
    mapaRotulo: '#B8BFC7',
    // La firma del cierre va con el oro del diseño, no con su tinta clara.
    firma: '#D8DDE3',
    // Su recepción también va centrada, con el castillo en plata arriba.
    recepcionCentrada: true,
    // Su tarjeta de la fecha va desnuda: la maqueta no le pone ornamento.
    fechaOrnamento: false,
    // Disco del color del diseño, y sin línea bajo el rótulo del cronograma.
    discoItinerario: 'rgba(200,205,212,.10)',
    discoBorde: '#C0C6CD',
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
      color: '#FFFFFF',
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
    qrTinta: '#0a0e18',
    tituloSeccion: '#D8DDE3',
    lugarNombre: '#FFFFFF',
    lugarHora: '#D8DDE3',
    lugarHoraSize: 14,
    lugarHoraPeso: 400,
    mapa: '#B8BFC7',
    itinerarioRotulo: '#B8BFC7',
    itinerarioRotuloSize: 13,
    itinerarioHora: '#D8DDE3',
    itinerarioHoraSize: 24,
    serial: '#B8BFC7',
    monogramaDegradado: 'linear-gradient(180deg, #FFFFFF 0%, #D8DDE3 60%)',
    nombre: '#FFFFFF',
    // Su nombre lleva sombra negra **y** un resplandor blanco, como en la maqueta.
    sombraNombre: '0 2px 10px rgba(0,0,0,.7), 0 0 24px rgba(255,255,255,.35)',
    anfitriones: { font: 'var(--font-dm-sans)', size: 12, color: '#B8BFC7', mayusculas: true },
    anfitrionesNombres: '#FFFFFF',
    fecha: '#D8DDE3',
    rotuloTenue: '#B8BFC7',
    faltan: '#D8DDE3',
  },
  // Los tamaños de su maqueta, y el castillo en plata: llega en guindo y ahí se
  // dessatura y se aclara.
  arte: {
    coronaWidth: 260,
    relojWidth: 100,
    castilloWidth: 90,
    castilloFiltro: 'grayscale(1) brightness(1.35) contrast(1.5)',
    vestimentaWidth: 200,
    cierreWidth: 200,
  },
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  // El borde plateado que la maqueta pone encima y debajo de la fecha. Es de este diseño y
  // no del esqueleto: los otros seis ponen un filete dibujado.
  ornamento: (
    <Image
      alt=""
      height={510}
      src={themeAsset('xv-mariana', 'borde-plata-sf.avif')}
      style={{ width: '60%', height: 'auto', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.6))' }}
      width={1400}
    />
  ),
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  rotulos: { itinerary: 'itineraryTitle' },
  corona: themeAsset('xv-mariana', 'micro-notas-opt.avif'),
  reloj: themeAsset('xv-mariana', 'reloj-plata-opt.avif'),
  castillo: themeAsset('xv-mariana', 'castillo-guindo-opt.avif'),
  vestimenta: themeAsset('xv-mariana', 'traje-plata-opt.avif'),
  cierre: themeAsset('xv-mariana', 'corona-plata-opt.avif'),
  // La torta la **dibuja** su maqueta; los otros cuatro son PNG de plata. Por eso esta
  // fila entra por `iconoNodo` y las demás caen a `icono`.
  iconoNodo: (clave) => (clave === 'torta' ? <TortaDePlata /> : undefined),
  icono: (clave) => themeAsset('xv-mariana', ICONOS[clave ?? ''] ?? 'sobre-plata-opt.avif'),
}
