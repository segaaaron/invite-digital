'use client'

import Image, { type ImageProps } from 'next/image'
import { useCallback, useState } from 'react'

type Estado = 'inicial' | 'esperando' | 'lista'

/**
 * `next/image` que **aparece con un fundido** si llega tarde, en vez de saltar de golpe sobre
 * el diseño. Para las invitaciones: cada una tiene su propio fondo y un hueco gris encima
 * (`ImagenConCarga`) desentonaría. Misma API que `Image`.
 *
 * Sin coste cuando la red va rápida: el servidor la pinta visible, y solo si al arrancar la
 * página todavía no había llegado se esconde y aparece al cargar. Así una portada que ya está
 * no espera a la hidratación para verse.
 */
export default function ImagenQueAparece({ alt, style, onLoad, onError, ...props }: ImageProps) {
  const [estado, setEstado] = useState<Estado>('inicial')
  const alMontar = useCallback((nodo: HTMLImageElement | null) => {
    if (nodo !== null) setEstado((antes) => (antes !== 'inicial' ? antes : nodo.complete ? 'lista' : 'esperando'))
  }, [])

  const estilo =
    estado === 'inicial'
      ? style
      : {
          ...style,
          ...(estado === 'esperando' ? { opacity: 0 } : {}),
          ...(style?.transition === undefined ? { transition: 'opacity 600ms ease-out' } : {}),
        }

  return (
    <Image
      {...props}
      alt={alt}
      onError={(e) => {
        setEstado('lista')
        onError?.(e)
      }}
      onLoad={(e) => {
        setEstado('lista')
        onLoad?.(e)
      }}
      ref={alMontar}
      style={estilo}
    />
  )
}
