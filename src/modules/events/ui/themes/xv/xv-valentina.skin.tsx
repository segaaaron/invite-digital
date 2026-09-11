import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { AbanicoOrnamental } from './AbanicoOrnamental'
import { chapaDePortada } from './cover-copy'
import { ValentinaCover } from './ValentinaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-valentina.palette'

type Archivo = (typeof THEME_ASSETS)['xv-valentina'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {
  recepcion: 'invitacion-recepcion.avif',
  corona: 'corona-icono1.avif',
  fiesta: 'fiesta-icono.avif',
  despedida: 'despedida-icono.avif',
}

/** La piel de «Mascarada». */
export const PIEL: PielXv = {
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  // «Lluvia de Sobres» no está: en la maqueta es una tarjeta **dentro** de los regalos, y
  // vive en el contenido de muestra, no como rótulo del libro de firmas.
  rotulos: { itinerary: 'Cronograma', gifts: 'Detalles que Abrazan' },
  // Su maqueta sí pinta «Detalles que Abrazan» con el sobre y el código.
  regalos: true,
  fondoBase: '#2a1140',
  velo: 'rgba(28,12,45,.55)',
  // Su fotografía va **fija a la ventana** y su velo sin desenfoque, como en la maqueta:
  // con el velo borroso de la marina, el fondo oscuro se apagaba entero.
  fondoFijo: true,
  veloInferior: 'rgba(28,12,45,.9)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-valentina', 'mascarada-morada.avif')}
      style={{ objectFit: 'cover', filter: 'saturate(1.1)' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <ValentinaCover
      accent={P.lila}
      badge={chapaDePortada(datos.eyebrow, datos.name)}
      bg="#1c0a2d"
      bgAsset={themeAsset('xv-valentina', 'mascarada-morada.avif')}
      hint={datos.enter}
      line1={datos.line1}
      line2={datos.line2}
      maskAsset={themeAsset('xv-valentina', 'mascara-sin-fondo.avif')}
      name={datos.name}
      openLabel={datos.openLabel}
      textColor={P.tinta}
      // «15 AÑOS», no «XV AÑOS», y va literal como en la maqueta
      // (`ValentinaIntroCover`, `invites-1.jsx:852`): es el **único** de los ocho que
      // escribe la cifra en la portada. No puede salir del monograma del contenido,
      // porque ese mismo dato pinta el «XV» grande del cuerpo, que sí es XV.
      title="15 AÑOS"
    />
  ),
  // Los colores que «Mascarada» reparte distinto de «Bajo el Mar»: su fecha va en oro y la
  // hora de su cronograma en marfil, justo al revés que la marina.
  piezas: {
    // La firma del cierre va con el oro del diseño, no con su tinta clara.
    firma: '#E8C87A',
    // El disco del cronograma es morado translúcido, y lo que separa el rótulo de la hora
    // es su ornamento, no la línea de la marina.
    discoItinerario: 'rgba(20,10,35,.5)',
    itinerarioSeparador: 'ornamento',
    // Su maqueta escribe **toda** la invitación con sombra negra, y el titular no lleva
    // halo: el fondo es una fotografía oscura, no el papel claro de la marina.
    haloTitular: 'none',
    // El código de la mesa de regalos va casi en negro, como en la maqueta: es lo que se lee.
    qrTinta: '#2a1140',
    // La tarjeta de regalos, medida contra su maqueta: el sobre y el filete van con el
    // borde del panel —no con el oro—, la nota del buzón en el tono apagado, y todo el
    // texto con la sombra negra que lleva sobre la fotografía.
    sobreAcento: P.lilaFuerte,
    sobresNota: '#C9B78A',
    sombraTexto: '0 2px 8px rgba(0,0,0,.75)',
    // La cita de «Mascarada» va dentro de un panel, no suelta: texto claro sobre la
    // fotografía morada, con su sombra negra y sin la opacidad de la marina.
    cita: {
      size: 13,
      weight: 700,
      color: '#F5EFE0',
      panel: true,
      espaciado: '0.14em',
      interlineado: 1.6,
      opacidad: 1,
      sombra: '0 2px 8px rgba(0,0,0,.75)',
    },
    musicaAcento: '#E8C87A',
    musicaPista: '#E8C87A',
    musicaArtista: '#C9B78A',
    vestimentaNota: '#C9B78A',
    vestimentaDetalle: '#F5EFE0',
    regalosIntro: '#F5EFE0',
    sobresRotulo: '#E8C87A',
    fecha: '#E8C87A',
    tituloSeccion: '#E8C87A',
    lugarNombre: '#F5EFE0',
    lugarDireccion: '#C9B78A',
    mapa: '#E8C87A',
    itinerarioRotulo: '#E8C87A',
    itinerarioHora: '#F5EFE0',
  },
  // Los tamaños y filtros de su maqueta: el castillo de la recepción va a 52, y la corona
  // del cronograma **en morado**, copiada literal de `invites-1.jsx:1148`. El comentario
  // que había aquí decía «en dorado, no en morado como la marina» y era al revés: la
  // maqueta gira 230 grados. Con `hue-rotate(2deg)` no se gira nada y salía dorada.
  arte: { castilloWidth: 52, marcoRetrato: `linear-gradient(160deg, ${P.lilaFuerte}, ${P.lila})`, marcoRetratoFiltro: 'none' },
  iconoTam: (clave) => ({ recepcion: 48, corona: 55, fiesta: 50, despedida: 60 })[clave ?? ''] ?? 48,
  iconoFiltro: (clave) =>
    clave === 'corona'
      ? 'brightness(0) saturate(100%) invert(64%) sepia(28%) saturate(1200%) hue-rotate(230deg) brightness(95%) contrast(90%)'
      : undefined,
  paleta: P,
  cristal: {
    background: P.vidrio,
    borderRadius: 16,
    border: `1.5px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  // Sin corona: la maqueta no pone ninguna pieza entre la cita y el retrato. La máscara
  // es del fondo y de la portada; encima del arco tapaba media fotografía.
  retrato: themeAsset('xv-valentina', 'xv3.avif'),
  // Sin pieza sobre la cuenta atrás: su maqueta no pone ninguna, y la máscara volvía a
  // aparecer aquí por segunda vez.
  castillo: themeAsset('xv-valentina', 'castillo2sf.avif'),
  vestimenta: themeAsset('xv-valentina', 'icono-vestimenta.avif'),
  cierre: themeAsset('xv-valentina', 'mascara-sin-fondo.avif'),
  icono: (clave) => themeAsset('xv-valentina', ICONOS[clave ?? ''] ?? 'corona-icono1.avif'),
  // El ornamento de esta piel es el abanico de su maqueta, no el filete de la marina.
  ornamento: <AbanicoOrnamental color={P.lilaFuerte} />,
  // En la tarjeta de regalos la maqueta no pone el filete degradado, sino ese mismo abanico.
  separadorRegalos: <AbanicoOrnamental color={P.lilaFuerte} />,
}
