import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { DividerOrnamental } from './DividerOrnamental'
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
  fondoBase: '#2a1140',
  velo: 'rgba(28,12,45,.55)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-valentina', 'mascarada-morada.avif')}
      style={{ objectFit: 'cover' }}
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
  corona: themeAsset('xv-valentina', 'mascara-sin-fondo.avif'),
  retrato: themeAsset('xv-valentina', 'xv3.avif'),
  reloj: themeAsset('xv-valentina', 'mascara-sin-fondo.avif'),
  castillo: themeAsset('xv-valentina', 'castillo2sf.avif'),
  vestimenta: themeAsset('xv-valentina', 'icono-vestimenta.avif'),
  cierre: themeAsset('xv-valentina', 'mascara-sin-fondo.avif'),
  icono: (clave) => themeAsset('xv-valentina', ICONOS[clave ?? ''] ?? 'corona-icono1.avif'),
  ornamento: <DividerOrnamental color={P.lila} />,
}
