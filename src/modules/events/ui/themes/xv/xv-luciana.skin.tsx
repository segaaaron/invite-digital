import Image from 'next/image'
import { THEME_ASSETS, themeAsset } from '../assets'
import { DividerOrnamental } from './DividerOrnamental'
import { PanelCover } from './PanelCover'
import type { PielXv } from './piel-xv'
import { PALETA as P } from './xv-luciana.palette'

type Archivo = (typeof THEME_ASSETS)['xv-luciana'][number]

/** Los iconos del cronograma, tipados contra el manifiesto: un nombre mal escrito no compila. */
const ICONOS: Record<string, Archivo> = {}

/** La piel de «Bosque Encantado». */
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
          src={themeAsset('xv-luciana', 'quinceanera-verde.avif')}
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      </div>
    </>
  ),
  fondoBase: '#0f2a1f',
  velo: 'rgba(10,28,20,.55)',
  fondo: (
    <Image
      alt=""
      aria-hidden
      fill
      priority
      sizes="100vw"
      src={themeAsset('xv-luciana', 'bosque-verdee.avif')}
      style={{ objectFit: 'cover' }}
    />
  ),
  burbujas: null,
  portada: (datos) => (
    <PanelCover
      accent={P.lila}
      bg="#0f2a1f"
      bgAsset={themeAsset('xv-luciana', 'bosque-verdee.avif')}
      emblemAsset={themeAsset('xv-luciana', 'faro-verde.avif')}
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
  // Cómo llama este diseño a sus secciones. Lo que no esté aquí cae al diccionario.
  // «Lluvia de Sobres» no está: en la maqueta es una tarjeta **dentro** de los regalos, y
  // vive en el contenido de muestra, no como rótulo del libro de firmas.
  rotulos: { itinerary: 'Cronograma', gifts: 'Detalles que Abrazan' },
  corona: themeAsset('xv-luciana', 'faro-verde.avif'),
  retrato: themeAsset('xv-luciana', 'quinceanera-verde.avif'),
  reloj: themeAsset('xv-luciana', 'reloj1.avif'),
  castillo: themeAsset('xv-luciana', 'faro-verde.avif'),
  vestimenta: themeAsset('xv-luciana', 'traje1.avif'),
  cierre: themeAsset('xv-luciana', 'borde.avif'),
  icono: (clave) => themeAsset('xv-luciana', ICONOS[clave ?? ''] ?? 'faro-verde.avif'),
  ornamento: <DividerOrnamental color={P.lila} />,
}
