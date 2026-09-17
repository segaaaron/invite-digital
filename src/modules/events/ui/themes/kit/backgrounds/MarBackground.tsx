import { themeAsset } from '../../assets'
import { FotoDeFondo } from './FotoDeFondo'

type Props = {
  /** Cuál de los dos fondos de mar de la maqueta. */
  readonly variant?: 'a' | 'b'
  readonly opacity?: number
  /** De qué tema salen las imágenes: `xv` y `xv-natalia` comparten diseño y no archivos. */
  readonly theme: 'xv'
}

/**
 * El fondo fotográfico de los diseños bajo el mar, con su velo de degradado.
 *
 * No anima: es una imagen. Por eso se queda en el servidor, sin `'use client'`.
 *
 * El velo superior e inferior no es decorativo: sobre la parte clara de la foto, el texto
 * dorado del diseño se pierde, y ese texto es la fecha y el lugar.
 */
export function MarBackground({ variant = 'a', opacity = 0.92, theme }: Props) {
  return (
    <>
      {/* Un archivo del repositorio: pasa por el optimizador. Entera en pantallas anchas. */}
      <FotoDeFondo opacity={opacity} priority src={themeAsset(theme, variant === 'a' ? 'mar-bg-a.avif' : 'mar-bg-b.avif')} />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.25) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
