'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly fotos: readonly string[]
  readonly borde: string
  readonly sombra: string
  readonly flechaFondo: string
  readonly flechaTinta: string
  readonly puntoActivo: string
  readonly puntoInactivo: string
  /** El fondo detrás de la foto, que asoma por los lados: la foto va entera, sin recortar. */
  readonly fondo?: string
  /** El nombre accesible de los dos botones, del diccionario. */
  readonly labels: { readonly anterior: string; readonly siguiente: string }
}

/** Lo que dura cada foto antes de pasar a la siguiente, como en la maqueta. */
const INTERVALO_MS = 3500

/**
 * El carrusel de fotografías de las Editorial (`PearlCarousel` de la maqueta): una foto
 * entera en un marco 4:5 que pasa sola cada tres segundos y medio con un acercamiento
 * lento, dos flechas y una fila de puntos.
 *
 * Las flechas y los puntos son `<button>` con su nombre accesible, no `<div onClick>` como
 * en la maqueta: quien navega con teclado tiene que poder pasar las fotos. Con movimiento
 * reducido no pasa sola ni se acerca.
 */
export function CarruselDePerla({ fotos, borde, sombra, flechaFondo, flechaTinta, puntoActivo, puntoInactivo, fondo = '#0a1628', labels }: Props) {
  const [indice, setIndice] = useState(0)
  const [reducido] = useState(prefiereMenosMovimiento)
  const cuantas = fotos.length

  useEffect(() => {
    if (reducido || cuantas < 2) return
    const identificador = setInterval(() => setIndice((actual) => (actual + 1) % cuantas), INTERVALO_MS)
    return () => clearInterval(identificador)
  }, [reducido, cuantas])

  if (cuantas === 0) return null

  const mover = (paso: number) => setIndice((actual) => (actual + paso + cuantas) % cuantas)
  const FLECHA: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 'none',
    background: flechaFondo,
    color: flechaTinta,
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  }

  return (
    <div style={{ marginTop: 24, position: 'relative' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/5',
          borderRadius: 16,
          overflow: 'hidden',
          border: `1.5px solid ${borde}`,
          boxShadow: `0 8px 30px ${sombra}`,
          background: fondo,
        }}
      >
        {fotos.map((foto, i) => (
          <Image
            alt=""
            aria-hidden={i !== indice}
            fill
            key={foto}
            sizes="(max-width: 480px) 90vw, 380px"
            src={foto}
            style={{
              objectFit: 'contain',
              opacity: i === indice ? 1 : 0,
              transform: i === indice && !reducido ? 'scale(1.05)' : 'scale(1)',
              transition: i === indice ? 'opacity 0.6s ease-in-out, transform 3.5s ease-out' : 'opacity 0.6s ease-in-out',
            }}
          />
        ))}
        <button aria-label={labels.anterior} onClick={() => mover(-1)} style={{ ...FLECHA, left: 10 }} type="button">
          ‹
        </button>
        <button aria-label={labels.siguiente} onClick={() => mover(1)} style={{ ...FLECHA, right: 10 }} type="button">
          ›
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
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
              background: i === indice ? puntoActivo : puntoInactivo,
              opacity: i === indice ? 1 : 0.5,
              transition: 'all 0.3s',
            }}
            type="button"
          />
        ))}
      </div>
    </div>
  )
}
