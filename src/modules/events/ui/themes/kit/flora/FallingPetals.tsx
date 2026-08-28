'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'
import { sembrado } from '../random'

type Props = {
  readonly count?: number
  readonly seed?: number
  /** Los tonos de los pétalos sueltos. Sin defecto: sería la paleta de otro diseño. */
  readonly palette: readonly string[]
}

/**
 * Pétalos sueltos cayendo, más simples que los de rosa: son óvalos, no dibujos.
 *
 * Los usa la boda botánica sobre la fotografía de portada, donde un pétalo detallado
 * competiría con la foto. Con movimiento reducido no se pintan, como el resto de fondos de
 * partículas.
 */
export function FallingPetals({ count = 12, seed = 7, palette }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)

  const petalos = useMemo(() => {
    const aleatorio = sembrado(seed)
    return Array.from({ length: count }, () => ({
      left: aleatorio() * 100,
      dur: aleatorio() * 10 + 12,
      delay: -(aleatorio() * 14),
      sz: aleatorio() * 7 + 6,
      rot: aleatorio() * 360,
      op: aleatorio() * 0.35 + 0.35,
      color: palette[Math.floor(aleatorio() * palette.length)] ?? 'white',
    }))
  }, [count, seed, palette])

  if (reducido) return null

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {petalos.map((petalo, indice) => (
        <div
          key={indice}
          style={
            {
              position: 'absolute',
              left: `${petalo.left}%`,
              top: -20,
              width: petalo.sz,
              height: petalo.sz * 1.4,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: petalo.color,
              opacity: petalo.op,
              transform: `rotate(${petalo.rot}deg)`,
              animation: `theme-petalFall ${petalo.dur}s linear ${petalo.delay}s infinite`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
