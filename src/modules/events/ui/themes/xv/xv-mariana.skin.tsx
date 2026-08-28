import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { PanelCover } from './PanelCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-mariana.palette'

type Archivo = (typeof THEME_ASSETS)['xv-mariana'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {
  recepcion: 'sobre-plata-opt.avif',
  cena: 'menu-plata-opt.avif',
  baile: 'baile-plata-opt.avif',
  despedida: 'auto-plata-opt.avif',
}

/** La piel de «Encanto Musical». */
export const PIEL: PielXv = {
  fondoBase: '#0c1830',
  velo: 'rgba(10,14,26,.48)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-mariana', 'fondo-disco-mariana-opt.avif')}
      style={{ objectFit: 'cover' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <PanelCover
      accent={P.lila}
      bg="#0c1830"
      bgAsset={themeAsset('xv-mariana', 'fondo-disco-tacones-opt.avif')}
      emblemAsset={themeAsset('xv-mariana', 'bola-sola-opt.avif')}
      eyebrow={datos.eyebrow}
      name={datos.name}
      openLabel={datos.openLabel}
      textColor={P.tinta}
      title={datos.title}
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
  corona: themeAsset('xv-mariana', 'micro-notas-opt.avif'),
  retrato: themeAsset('xv-mariana', 'fondo-disco-tacones-opt.avif'),
  reloj: themeAsset('xv-mariana', 'reloj-plata-opt.avif'),
  castillo: themeAsset('xv-mariana', 'castillo-guindo-opt.avif'),
  vestimenta: themeAsset('xv-mariana', 'traje-plata-opt.avif'),
  cierre: themeAsset('xv-mariana', 'corona-plata-opt.avif'),
  icono: (clave) => themeAsset('xv-mariana', ICONOS[clave ?? ''] ?? 'sobre-plata-opt.avif'),
}
