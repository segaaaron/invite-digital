'use client'

import { useMemo, useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'
import { sembrado } from '../random'

type Props = {
  readonly count?: number
  readonly color: string
  /** El glifo que flota: ✦ en los nocturnos, ❀ en los florales. */
  readonly char?: string
  readonly size?: number
  readonly seed?: number
  readonly drift?: 'up' | 'down' | 'side'
}

/**
 * Partículas a la deriva: chispas, pétalos o copos, según el glifo.
 *
 * Con movimiento reducido no se pinta, como el resto de fondos de partículas: es
 * decoración pura y dieciocho glifos inmóviles sobre el texto se leen como suciedad.
 */
export function FloatingParticles({ count = 18, color, char = '✦', size = 12, seed = 5, drift = 'up' }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)

  const particulas = useMemo(() => {
    const aleatorio = sembrado(seed)
    return Array.from({ length: count }, () => ({
      left: aleatorio() * 100,
      top: aleatorio() * 100,
      dur: aleatorio() * 8 + 8,
      delay: aleatorio() * 8,
      sz: aleatorio() * size * 0.6 + size * 0.5,
      op: aleatorio() * 0.5 + 0.3,
      rot: aleatorio() * 360,
    }))
  }, [count, seed, size])

  if (reducido) return null

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particulas.map((particula, indice) => (
        <div
          key={indice}
          style={{
            position: 'absolute',
            left: `${particula.left}%`,
            top: `${particula.top}%`,
            fontSize: particula.sz,
            color,
            opacity: particula.op,
            animation: `theme-drift-${drift} ${particula.dur}s linear ${particula.delay}s infinite`,
            transform: `rotate(${particula.rot}deg)`,
          }}
        >
          {char}
        </div>
      ))}
    </div>
  )
}
