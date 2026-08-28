'use client'

import { useMemo, useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'
import { sembrado } from '../random'

type Props = {
  readonly count?: number
  readonly color: string
  readonly seed?: number
}

/**
 * Las burbujas de los diseños bajo el mar.
 *
 * Van en `position: fixed` a propósito, como en la maqueta: así siguen subiendo mientras
 * la invitación se desplaza, en vez de quedarse ancladas a un tramo de la página.
 *
 * Los retardos son negativos para que al abrir ya haya burbujas a media altura: arrancar
 * todas desde abajo a la vez delata la animación.
 */
export function BubblesRise({ count = 22, color, seed = 7 }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)

  const burbujas = useMemo(() => {
    const aleatorio = sembrado(seed)
    return Array.from({ length: count }, () => ({
      left: aleatorio() * 100,
      sz: aleatorio() * 14 + 5,
      dur: aleatorio() * 9 + 7,
      delay: -aleatorio() * 16,
      sway: aleatorio() * 30 - 15,
      op: aleatorio() * 0.35 + 0.25,
    }))
  }, [count, seed])

  if (reducido) return null

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
      {burbujas.map((burbuja, indice) => (
        <div
          key={indice}
          style={
            {
              position: 'absolute',
              left: `${burbuja.left}%`,
              bottom: -40,
              width: burbuja.sz,
              height: burbuja.sz,
              borderRadius: '50%',
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), ${color} 55%, rgba(255,255,255,0.05) 100%)`,
              border: '1px solid rgba(255,255,255,0.5)',
              opacity: burbuja.op,
              '--sway': `${burbuja.sway}px`,
              animation: `theme-bubbleRise ${burbuja.dur}s ease-in ${burbuja.delay}s infinite`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
