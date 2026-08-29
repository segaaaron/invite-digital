import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { DividerOrnamental } from './DividerOrnamental'
import { FantasiaCover } from './FantasiaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-fantasia.palette'

type Archivo = (typeof THEME_ASSETS)['xv-fantasia'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {}

/** La piel de «Noche Estrellada». */
export const PIEL: PielXv = {
  fondoBase: '#0c1830',
  velo: 'rgba(10,20,42,.48)',
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
      envelopeAsset={themeAsset('xv-fantasia', 'sobre-corona-recortado.avif')}
      hint={datos.enter}
      name={datos.name}
      openLabel={datos.openLabel}
      textColor={P.tinta}
      tiaraAsset={themeAsset('xv-fantasia', 'tiara-vino-sf.avif')}
      title={`${datos.title} AÑOS`}
    />
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
  rotulos: { itinerary: 'Itinerario' },
  corona: themeAsset('xv-fantasia', 'luna-estrella-opt.avif'),
  retrato: themeAsset('xv-fantasia', 'noche-estrellada-portada.avif'),
  reloj: themeAsset('xv-fantasia', 'reloj-dorado-opt.avif'),
  castillo: themeAsset('xv-fantasia', 'sobre-corona-recortado.avif'),
  vestimenta: themeAsset('xv-fantasia', 'flores-sin-fondo.avif'),
  cierre: themeAsset('xv-fantasia', 'tiara-vino-sf.avif'),
  icono: (clave) => themeAsset('xv-fantasia', ICONOS[clave ?? ''] ?? 'luna-estrella-opt.avif'),
  ornamento: <DividerOrnamental color={P.lila} />,
}
