import { THEME_ASSETS, themeAsset } from '../assets'
import { BubblesRise } from '../kit/backgrounds/BubblesRise'
import { MarBackground } from '../kit/backgrounds/MarBackground'
import { SofiaCover } from './SofiaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv.palette'

type ArchivoXv = (typeof THEME_ASSETS)['xv'][number]

/**
 * Los cuatro iconos del cronograma, tipados contra el manifiesto de imágenes: un nombre
 * mal escrito no compila, en vez de dejar un hueco que solo se ve abriendo la invitación.
 */
const ICONOS: Record<string, ArchivoXv> = {
  recepcion: 'invitacion-recepcion.avif',
  corona: 'corona-icono1.avif',
  fiesta: 'fiesta-icono.avif',
  despedida: 'despedida-icono.avif',
}

/** La piel de «Bajo el Mar»: pasteles sobre fotografía de mar. */
export const PIEL_XV: PielXv = {
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  // «Lluvia de Sobres» no está: en la maqueta es una tarjeta **dentro** de los regalos, y
  // vive en el contenido de muestra, no como rótulo del libro de firmas.
  rotulos: { itinerary: 'Cronograma', gifts: 'Detalles que Abrazan' },
  // Su maqueta sí pinta «Detalles que Abrazan» con el sobre y el código.
  regalos: true,
  fondoBase: `linear-gradient(160deg, ${P.cielo} 0%, ${P.lavanda} 45%, ${P.rosa} 100%)`,
  // Pegado a la pantalla y con un velo ligero: estirado a lo largo de la invitación entera,
  // con velo al 45 % y desenfoque, la foto se veía lechosa y borrosa (pedido por el usuario).
  velo: 'rgba(252,250,255,.22)',
  fondo: <MarBackground opacity={1} theme="xv" variant="b" />,
  fondoFijo: true,
  burbujas: <BubblesRise color="rgba(180,220,255,0.5)" count={24} seed={11} />,
  // Las burbujas de la maqueta (`invites-1.jsx:351-352`) son de este diseño y de ninguno
  // más: es el fondo del mar. Van pedidas a propósito, no heredadas.
  burbujasPremium: true,
  // Las chispas de su maqueta (`invites-1.jsx:353`): dieciocho, lilas. Van declaradas
  // porque ya no hay valores por defecto — los que había eran estos, y se los quedaban
  // los cinco diseños que en la maqueta no llevan ninguna.
  particulas: { char: '✦', color: P.orquidea, count: 18 },
  portada: (datos) => (
    <SofiaCover
      bgAsset={themeAsset('xv', 'bajo-el-mar1.avif')}
      crownAsset={themeAsset('xv', 'mar-corona-purple.avif')}
      hint={datos.enter}
      line1={datos.line1}
      line2={datos.line2}
      name={datos.name}
      openLabel={datos.openLabel}
      title={`${datos.title} AÑOS`}
    />
  ),
  // El código de la mesa de regalos, con el aro lila que le pone la maqueta.
  piezas: {
    qrTinta: P.violetaHondo,
    qrAro: P.lila,
    // Su tarjeta de la fecha va enmarcada por dos filetes, arriba y abajo.
    fechaFiletes: true,
  },
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: `1px solid ${P.bordeVidrio}`,
    boxShadow: P.sombra,
  },
  corona: themeAsset('xv', 'mar-corona.avif'),
  retrato: themeAsset('xv', 'xv3.avif'),
  reloj: themeAsset('xv', 'vestido-solo.avif'),
  castillo: themeAsset('xv', 'castillo-purpura.avif'),
  vestimenta: themeAsset('xv', 'icono-vestimenta.avif'),
  cierre: themeAsset('xv', 'concha-recortada.avif'),
  icono: (clave) => themeAsset('xv', ICONOS[clave ?? ''] ?? 'corona-icono1.avif'),
  iconoTam: (clave) => ({ recepcion: 48, corona: 55, fiesta: 50, despedida: 60 })[clave ?? ''] ?? 48,
  // La corona llega en dorado y la maqueta la tiñe del morado del diseño.
  iconoFiltro: (clave) =>
    clave === 'corona'
      ? 'brightness(0) saturate(100%) invert(24%) sepia(84%) saturate(2500%) hue-rotate(265deg) brightness(80%) contrast(105%) opacity(0.6)'
      : undefined,
}
