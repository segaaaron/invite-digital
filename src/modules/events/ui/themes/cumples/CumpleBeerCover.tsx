'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  /** El color de debajo, para el instante en que la imagen todavía no está. */
  readonly bg: string
  readonly accent: string
  /** El arte de portada del diseño: la etiqueta de cervecería, con el medallón vacío. */
  readonly bgAsset: string
  /** Quien cumple. Va rotulado dentro del medallón, que es donde lo pone el arte. */
  readonly name: string
  readonly openLabel: string
}

/** El tamaño del arte. El nombre se coloca en sus coordenadas, no en las de la pantalla. */
const ARTE = { ancho: 768, alto: 1376 } as const

/** El hueco del medallón, medido sobre el arte: ahí iba el nombre rotulado. */
const MEDALLON = { x: 384, y: 578, ancho: 400 } as const

/**
 * La portada de «Cervecería Vintage»: la ilustración a sangre y el nombre de quien cumple
 * dentro del medallón.
 *
 * **El arte va sin nombre y el nombre se pinta encima.** Venía con «MIGUEL» rotulado dentro
 * —es de quien se hizo la invitación— y así el modelo solo servía para él: cualquier otro
 * cumpleaños abriría su invitación con el nombre de otra persona. Se le quitó del propio
 * archivo, dejando el medallón vacío, y ahora lo escribe el diseño con lo que el cliente
 * pone en su panel.
 *
 * Va en un `<svg>` con el `viewBox` del arte, y no en un `<div>` con porcentajes: así el
 * texto se escala y se recorta **exactamente igual** que la ilustración, en el teléfono y
 * en el marco del escaparate, sin cuentas de proporción en ninguna parte.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function CumpleBeerCover({ bg, accent, bgAsset, name, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  const escrito = name.trim()
  // El nombre llena el medallón y no se sale: los largos encogen, los cortos no se estiran.
  const tamano = Math.min(84, Math.round((84 * 6) / Math.max(escrito.length, 1)))

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      onClick={() => setAbierta(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        overflow: 'hidden',
        background: bg,
        color: accent,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      {escrito === '' ? null : (
        <svg
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox={`0 0 ${ARTE.ancho} ${ARTE.alto}`}
        >
          <text
            dominantBaseline="middle"
            lengthAdjust="spacingAndGlyphs"
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: tamano,
              fontWeight: 700,
              letterSpacing: '0.04em',
              fill: '#f3e0b8',
              paintOrder: 'stroke fill',
              stroke: 'rgba(12,8,4,0.55)',
              strokeWidth: 3,
            }}
            textAnchor="middle"
            textLength={escrito.length > 10 ? MEDALLON.ancho : undefined}
            x={MEDALLON.x}
            y={MEDALLON.y}
          >
            {escrito.toUpperCase()}
          </text>
        </svg>
      )}
    </button>
  )
}
