'use client'

import { useMemo, useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'
import { sembrado } from '../random'

type Props = {
  readonly count?: number
  /** Sin valor por defecto a propósito: un defecto es un hexadecimal escondido en el kit. */
  readonly color: string
  readonly seed?: number
}

/**
 * El cielo estrellado de los diseños nocturnos.
 *
 * **Con movimiento reducido no se pinta.** Es la excepción que sí se esconde entera, y vale
 * para los seis fondos de partículas: son decoración pura, su estado quieto no aporta
 * nada, y dejar cuarenta y cinco puntos fijos sobre el fondo se lee como suciedad en la
 * pantalla. Las piezas con contenido hacen lo contrario —se enseñan sin animar—, porque
 * ahí lo que hay debajo es información.
 */
export function Starfield({ count = 50, color, seed = 1 }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)

  const estrellas = useMemo(() => {
    const aleatorio = sembrado(seed)
    return Array.from({ length: count }, () => ({
      x: aleatorio() * 100,
      y: aleatorio() * 100,
      size: aleatorio() * 2 + 0.5,
      op: aleatorio() * 0.6 + 0.3,
      delay: aleatorio() * 3,
    }))
  }, [count, seed])

  if (reducido) return null

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {estrellas.map((estrella, indice) => (
        <div
          // Las estrellas no tienen identidad y la lista no se reordena nunca: el índice es
          // la clave correcta aquí.
          key={indice}
          style={{
            position: 'absolute',
            left: `${estrella.x}%`,
            top: `${estrella.y}%`,
            width: estrella.size,
            height: estrella.size,
            borderRadius: '50%',
            background: color,
            opacity: estrella.op,
            boxShadow: `0 0 ${estrella.size * 3}px ${color}`,
            animation: `theme-twinkle 3s ease-in-out ${estrella.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
