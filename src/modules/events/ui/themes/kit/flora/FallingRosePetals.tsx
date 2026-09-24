'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'
import { sembrado } from '../random'
import { RosePetalSVG } from './RosePetalSVG'

type Props = {
  readonly count?: number
  /** Los tonos de pétalo de este diseño. Sin defecto: el defecto sería la paleta de otro. */
  readonly palette: readonly string[]
  /** Los dos tonos de borde oscuro. Sin defecto: un defecto es un hexadecimal escondido. */
  readonly darkEdges: readonly [string, string]
  readonly seed?: number
}

/**
 * La lluvia de pétalos de los ocho diseños de boda.
 *
 * Va en `position: sticky` con `marginBottom: -100vh`, tal como la maqueta: así la capa de
 * pétalos queda anclada a la ventana mientras la invitación se desplaza por debajo, y el
 * margen negativo se come el hueco para que no empuje el contenido. Con `fixed` no se
 * podría, porque estos diseños tienen fondos propios apilados por `z-index`.
 *
 * Con movimiento reducido no se pinta: catorce pétalos parados a media caída se leen como
 * una imagen rota, no como decoración.
 */
export function FallingRosePetals({ count = 14, palette, darkEdges, seed }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)
  const semilla = seed ?? palette.join(',').length + count

  const petalos = useMemo(() => {
    const aleatorio = sembrado(semilla)
    return Array.from({ length: count }, () => {
      const color = palette[Math.floor(aleatorio() * palette.length)] ?? 'white'
      const borde = aleatorio() > 0.5 ? darkEdges[0] : darkEdges[1]
      return {
        left: aleatorio() * 100,
        dur: aleatorio() * 12 + 16,
        delay: -(aleatorio() * 18),
        sz: aleatorio() * 9 + 11,
        rotStart: aleatorio() * 360,
        rotEnd: aleatorio() * 720 - 360,
        sway: (aleatorio() > 0.5 ? 1 : -1) * (aleatorio() * 60 + 30),
        variant: Math.floor(aleatorio() * 2) as 0 | 1,
        color,
        darkEdge: borde,
        opacity: aleatorio() * 0.3 + 0.4,
        flip: aleatorio() > 0.5,
      }
    })
  }, [count, semilla, palette, darkEdges])

  if (reducido) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--alto, 100dvh)',
        marginBottom: 'calc(var(--alto, 100dvh) * -1)',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {petalos.map((petalo, indice) => (
        <div
          key={indice}
          style={
            {
              position: 'absolute',
              left: `${petalo.left}%`,
              top: 0,
              width: petalo.sz,
              height: petalo.sz * 1.16,
              opacity: petalo.opacity,
              willChange: 'transform',
              animation: `theme-petalDrop ${petalo.dur}s linear ${petalo.delay}s infinite`,
              '--sway': `${petalo.sway}px`,
              '--rotEnd': `${petalo.rotEnd}deg`,
            } as CSSProperties
          }
        >
          <div style={{ width: '100%', height: '100%', transform: petalo.flip ? 'scaleX(-1)' : undefined }}>
            <RosePetalSVG color={petalo.color} darkEdge={petalo.darkEdge} startRot={petalo.rotStart} variant={petalo.variant} />
          </div>
        </div>
      ))}
    </div>
  )
}
