'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'
import { sembrado } from '../random'

type Props = { readonly count?: number }

/**
 * Las burbujas de cristal de los diseños bajo el mar, detrás del contenido.
 *
 * Se reparten por los dos bordes y no por el centro: el texto de la invitación va en
 * medio, y una burbuja de cuarenta y cinco píxeles cruzándolo lo hace ilegible durante
 * ocho segundos. El sesgo al borde (`edgeBias`) es lo que las empuja fuera, y las grandes
 * caen más cerca del canto porque leen como más cercanas.
 *
 * Este es el único fondo sin color por prop: su brillo es blanco sobre lo que haya debajo,
 * como el cristal, y llevarlo a la paleta de cada tema no cambiaría nada.
 */
export function PremiumBubbles({ count = 8 }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)

  const burbujas = useMemo(() => {
    const aleatorio = sembrado(31)
    const porLado = count / 2
    return [-1, 1].flatMap((lado) =>
      Array.from({ length: porLado }, (_, indice) => {
        const hueco = (indice + 0.5) / porLado
        const profundidad = aleatorio()
        const sesgoAlBorde = (1 - profundidad) ** 1.5
        return {
          left: lado === -1 ? 2 + sesgoAlBorde * 12 : 98 - sesgoAlBorde * 12,
          sz: 10 + sesgoAlBorde * 45,
          riseDur: aleatorio() * 8 + 8,
          riseDelay: -(hueco * 16 + aleatorio() * 4),
          swayDur: aleatorio() * 4 + 3,
          swayDelay: -aleatorio() * 6,
          sway: aleatorio() * 25 + 25,
        }
      }),
    )
  }, [count])

  if (reducido) return null

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {burbujas.map((burbuja, indice) => (
        <div
          key={indice}
          style={{
            position: 'absolute',
            left: `${burbuja.left}%`,
            bottom: -80,
            width: burbuja.sz,
            height: burbuja.sz,
            animation: `theme-premiumBubbleRise ${burbuja.riseDur}s linear ${burbuja.riseDelay}s infinite`,
            willChange: 'transform',
          }}
        >
          <div
            style={
              {
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 35% 30%, rgba(255,255,255,.22) 0%, rgba(190,225,240,.10) 50%, rgba(255,255,255,.04) 100%)',
                boxShadow:
                  'inset -1px -1px 0 1px rgba(255,255,255,.12), inset 1.5px 1.5px 0 0.5px rgba(255,255,255,.7)',
                '--sway': `${burbuja.sway}px`,
                animation: `theme-premiumBubbleSway ${burbuja.swayDur}s ease-in-out ${burbuja.swayDelay}s infinite`,
                willChange: 'transform',
              } as CSSProperties
            }
          />
        </div>
      ))}
    </div>
  )
}
