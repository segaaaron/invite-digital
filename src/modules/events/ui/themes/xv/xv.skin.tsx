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
  fondoBase: `linear-gradient(160deg, ${P.cielo} 0%, ${P.lavanda} 45%, ${P.rosa} 100%)`,
  velo: 'rgba(252,250,255,.45)',
  fondo: <MarBackground opacity={1} theme="xv" variant="b" />,
  burbujas: <BubblesRise color="rgba(180,220,255,0.5)" count={24} seed={11} />,
  portada: (datos) => (
    <SofiaCover
      bgAsset={themeAsset('xv', 'bajo-el-mar1.avif')}
      crownAsset={themeAsset('xv', 'mar-corona-purple.avif')}
      eyebrow={datos.eyebrow}
      name={datos.name}
      openLabel={datos.openLabel}
      title={datos.title}
    />
  ),
  paleta: P,
  cristal: {
    background: P.vidrio,
    backdropFilter: 'blur(14px)',
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
}
