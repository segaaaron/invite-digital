import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { NataliaCover } from './NataliaCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-natalia.palette'

type ArchivoNatalia = (typeof THEME_ASSETS)['xv-natalia'][number]

const ICONOS: Record<string, ArchivoNatalia> = {
  recepcion: 'invitacion-recepcion.avif',
  corona: 'corona-icono1.avif',
  fiesta: 'fiesta-icono.avif',
  despedida: 'despedida-icono.avif',
}

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
  rotulos: { itinerary: 'Cronograma', gifts: 'Detalles que Abrazan' },
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
      bgAsset={themeAsset('xv-natalia', 'fondo-musical.avif')}
      eyebrow={datos.eyebrow}
      name={datos.name}
      noteAsset={themeAsset('xv-natalia', 'nota-sol-dorado-sf.avif')}
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
  corona: themeAsset('xv-natalia', 'guitarra-y-saxo-dorado-sf.avif'),
  retrato: themeAsset('xv-natalia', 'bajo-el-mar1.avif'),
  reloj: themeAsset('xv-natalia', 'nota-sol-sf.avif'),
  castillo: themeAsset('xv-natalia', 'castillo-purpura.avif'),
  vestimenta: themeAsset('xv-natalia', 'icono-vestimenta.avif'),
  cierre: themeAsset('xv-natalia', 'concha-recortada.avif'),
  icono: (clave) => themeAsset('xv-natalia', ICONOS[clave ?? ''] ?? 'corona-icono1.avif'),
}
