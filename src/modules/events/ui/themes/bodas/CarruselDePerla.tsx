'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = {
  readonly fotos: readonly string[]
  readonly borde: string
  readonly sombra: string
  readonly flechaFondo: string
  readonly flechaTinta: string
  readonly puntoActivo: string
  readonly puntoInactivo: string
  /** El nombre accesible de los dos botones, del diccionario. */
  readonly labels: { readonly anterior: string; readonly siguiente: string }
}

/**
 * El carrusel de fotografías de las Editorial (`PearlCarousel` de la maqueta): una foto
 * grande con marco, dos flechas y una fila de puntos.
 *
 * Las flechas son `<button>` con su nombre accesible, no `<div onClick>` como en la
 * maqueta: quien navega con teclado tiene que poder pasar las fotos.
 */
export function CarruselDePerla({ fotos, borde, sombra, flechaFondo, flechaTinta, puntoActivo, puntoInactivo, labels }: Props) {
  const [indice, setIndice] = useState(0)
  if (fotos.length === 0) return null

  const mover = (paso: number) => setIndice((actual) => (actual + paso + fotos.length) % fotos.length)
  const FLECHA: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: flechaFondo,
    color: flechaTinta,
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    zIndex: 2,
  }

  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1.5px solid ${borde}`,
          boxShadow: `0 10px 30px ${sombra}`,
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
            style={{ objectFit: 'cover', opacity: i === indice ? 1 : 0, transition: 'opacity 400ms ease' }}
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
          <span
            aria-hidden
            key={foto}
            style={{ display: 'block', width: 7, height: 7, borderRadius: '50%', background: i === indice ? puntoActivo : puntoInactivo }}
          />
        ))}
      </div>
    </div>
  )
}
