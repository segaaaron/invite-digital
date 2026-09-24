'use client'

import Image from 'next/image'
import { type CSSProperties, useEffect, useState } from 'react'

type Props = {
  readonly fotos: readonly string[]
  /** El oro del marco, las flechas y los puntos. */
  readonly oro: string
  /** El fondo translúcido de las flechas. */
  readonly flechaFondo: string
  /** El nombre accesible de los dos botones, del diccionario. */
  readonly labels: { readonly anterior: string; readonly siguiente: string }
}

/** Lo que dura cada foto antes de pasar a la siguiente, como en la maqueta. */
const INTERVALO_MS = 4000

/**
 * El carrusel «Nosotros» de «Cinemática» (`NosotrosCarousel`, `wedding-variants-9.jsx`):
 * fotos a sangre en un marco dorado de 72 % de la pantalla que se funden cada cuatro
 * segundos, dos flechas redondas con filete y una fila de puntos.
 *
 * Flechas y puntos son `<button>` con nombre accesible. Con movimiento reducido no pasa
 * solo; eso se decide en el efecto, no en el primer render, para no descuadrar la
 * hidratación.
 */
export function CarruselNosotros({ fotos, oro, flechaFondo, labels }: Props) {
  const [indice, setIndice] = useState(0)
  const cuantas = fotos.length

  useEffect(() => {
    if (cuantas < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const identificador = setInterval(() => setIndice((actual) => (actual + 1) % cuantas), INTERVALO_MS)
    return () => clearInterval(identificador)
  }, [cuantas])

  if (cuantas === 0) return null

  const mover = (paso: number) => setIndice((actual) => (actual + paso + cuantas) % cuantas)
  const FLECHA: CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: `1px solid ${oro}`,
    background: flechaFondo,
    color: oro,
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  }

  return (
    <div style={{ marginTop: 20, position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', height: '72vh', overflow: 'hidden', padding: '0 14px', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${oro}` }}>
          {fotos.map((foto, i) => (
            <Image
              alt=""
              aria-hidden={i !== indice}
              fill
              key={foto}
              sizes="(max-width: 480px) 92vw, 400px"
              src={foto}
              style={{ objectFit: 'cover', objectPosition: 'center', opacity: i === indice ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}
            />
          ))}
          <button aria-label={labels.anterior} onClick={() => mover(-1)} style={{ ...FLECHA, left: 10 }} type="button">
            ‹
          </button>
          <button aria-label={labels.siguiente} onClick={() => mover(1)} style={{ ...FLECHA, right: 10 }} type="button">
            ›
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {fotos.map((foto, i) => (
          <button
            aria-current={i === indice}
            aria-label={`${i + 1} / ${cuantas}`}
            key={foto}
            onClick={() => setIndice(i)}
            style={{
              display: 'block',
              width: 8,
              height: 8,
              padding: 0,
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              background: oro,
              opacity: i === indice ? 1 : 0.4,
              transition: 'opacity 0.3s',
            }}
            type="button"
          />
        ))}
      </div>
    </div>
  )
}
