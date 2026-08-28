import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { PanelCover } from './PanelCover'
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
  fondoBase: '#2b050c',
  velo: 'rgba(45,10,22,.48)',
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
    <PanelCover
      accent={P.lila}
      bg="#2b050c"
      bgAsset={themeAsset('xv-valeria', 'marco-guindo-portada.avif')}
      emblemAsset={themeAsset('xv-valeria', 'tiara-vino-sf.avif')}
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
  corona: themeAsset('xv-valeria', 'candelabro-guindo-sf.avif'),
  retrato: themeAsset('xv-valeria', 'xv-guindo-photo.avif'),
  reloj: themeAsset('xv-valeria', 'reloj-plata-opt.avif'),
  castillo: themeAsset('xv-valeria', 'castillo-guindo-opt.avif'),
  vestimenta: themeAsset('xv-valeria', 'traje1-opt.avif'),
  cierre: themeAsset('xv-valeria', 'corona-plata-opt.avif'),
  icono: (clave) => themeAsset('xv-valeria', ICONOS[clave ?? ''] ?? 'bienvenida-guindo-round.avif'),
  iconoRedondo: true,
}
