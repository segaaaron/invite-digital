'use client'

import Image, { type ImageProps } from 'next/image'
import { useCallback, useState } from 'react'

/**
 * `next/image` con hueco de carga: mientras la imagen no llega, su caja enseña un brillo sobre
 * el relleno hundido (`.imagen-cargando`) en vez de un rectángulo vacío. Misma API que `Image`.
 *
 * - **No oculta la imagen**: se pinta en cuanto llega, sin esperar a la hidratación ni tocar el
 *   LCP. Lo único que cambia es el fondo de su caja mientras tanto.
 * - **El fondo se quita al cargar**: detrás de una imagen con transparencia —los sobres de la
 *   portada— seguiría asomando.
 * - La que ya estaba en caché, o llegó antes de hidratar, no dispara `onLoad`: se mira `complete`.
 */
export default function ImagenConCarga({ alt, className = '', onLoad, onError, ...props }: ImageProps) {
  const [cargada, setCargada] = useState(false)
  const alMontar = useCallback((nodo: HTMLImageElement | null) => {
    if (nodo?.complete) setCargada(true)
  }, [])

  return (
    <Image
      {...props}
      alt={alt}
      className={`${className} ${cargada ? '' : 'imagen-cargando'}`.trim()}
      onError={(e) => {
        setCargada(true)
        onError?.(e)
      }}
      onLoad={(e) => {
        setCargada(true)
        onLoad?.(e)
      }}
      ref={alMontar}
    />
  )
}
