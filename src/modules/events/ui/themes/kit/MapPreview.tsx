'use client'

import { useState } from 'react'
import { comoLlegar, mapaIncrustado } from '../../../domain/ubicacion'
import { prefiereMenosMovimiento } from './motion'

type Props = {
  readonly accent: string
  readonly border: string
  /** El nombre del lugar. Del contenido del evento, no del código. */
  readonly label: string
  readonly coords: string
  readonly height?: number
  readonly roadWidth?: number
  readonly pinRing?: string
  readonly labelColor?: string
  readonly labelLetterSpacing?: string
  readonly coordsColor?: string
  /** El punto del alfiler, que contrasta contra el acento. */
  readonly pinDot: string
  /** El enlace de Google Maps que pegó el atelier, o la búsqueda de la dirección que escribió. */
  readonly href?: string | undefined
  /** La dirección del lugar, si no hay enlace ni coordenadas: «Hacienda Las Estrellas, Km 8». */
  readonly respaldo?: string | undefined
  /** «VER UBICACIÓN», en el idioma del evento. */
  readonly directionsLabel?: string | undefined
}

/**
 * El mapa del lugar, dentro del marco del diseño.
 *
 * Con algo que ubicar —el enlace de Google Maps, las coordenadas o la dirección— es **el
 * mapa de Google de verdad**, incrustado sin clave (`output=embed`), con el rótulo y el botón
 * de cómo llegar pintados con los colores del diseño encima. Pedido por el usuario: el plano
 * dibujado no servía para llegar. Sin nada que ubicar, queda el plano estilizado de siempre.
 *
 * El iframe carga en diferido: no se pide a Google hasta que el invitado baja hasta aquí.
 */
export function MapPreview({
  accent,
  border,
  label,
  coords,
  height = 140,
  roadWidth = 0.6,
  pinRing,
  labelColor,
  labelLetterSpacing = '0.3em',
  coordsColor,
  pinDot,
  href,
  respaldo,
  directionsLabel,
}: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)
  const incrustado = mapaIncrustado({ href, coords, label }, respaldo)
  const llegar = comoLlegar({ href, coords }) ?? (incrustado === null ? null : incrustado.replace('&z=16&output=embed', ''))

  if (incrustado !== null) {
    return (
      <div style={{ position: 'relative', height: Math.max(height, 220), borderRadius: 8, overflow: 'hidden', border: `1px solid ${border}` }}>
        <iframe
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={incrustado}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          title={label === '' ? 'Mapa del lugar' : `Mapa: ${label}`}
        />
        {label === '' ? null : (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              maxWidth: 'calc(100% - 20px)',
              padding: '6px 10px',
              borderRadius: 999,
              background: pinDot,
              border: `1px solid ${border}`,
              fontFamily: 'var(--font-cinzel)',
              fontWeight: 600,
              fontSize: 9,
              letterSpacing: labelLetterSpacing,
              textTransform: 'uppercase',
              color: labelColor ?? accent,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            ● {label}
          </div>
        )}
        {llegar === null ? null : (
          <a
            href={llegar}
            rel="noopener noreferrer"
            style={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              padding: '8px 14px',
              borderRadius: 999,
              background: accent,
              color: pinDot,
              fontFamily: 'var(--font-cinzel)',
              fontWeight: 600,
              fontSize: 9,
              letterSpacing: '0.2em',
              textDecoration: 'none',
              boxShadow: `0 6px 16px ${accent}40`,
            }}
            target="_blank"
          >
            {directionsLabel ?? 'VER UBICACIÓN'}
          </a>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${border}`,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <svg
        aria-hidden
        height="100%"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
        viewBox="0 0 200 100"
        width="100%"
      >
        <path d="M-10,30 Q60,40 100,20 T210,40" fill="none" stroke={border} strokeWidth={roadWidth} />
        <path d="M-10,70 Q40,60 100,80 T210,60" fill="none" stroke={border} strokeWidth={roadWidth} />
        <path d="M40,-10 Q50,40 30,60 T50,110" fill="none" stroke={border} strokeWidth={roadWidth} />
        <path d="M130,-10 Q120,50 140,70 T130,110" fill="none" stroke={border} strokeWidth={roadWidth} />
        <circle cx="100" cy="50" fill={accent} r="2" />
      </svg>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-100%)',
          animation: reducido ? undefined : 'theme-pinBounce 1.6s ease-in-out infinite',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50% 50% 50% 0',
            background: accent,
            transform: 'rotate(-45deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: pinRing === undefined ? `0 6px 16px ${accent}40` : `0 0 0 3px ${pinRing}, 0 6px 16px ${accent}40`,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: pinDot, transform: 'rotate(45deg)' }} />
        </div>
      </div>

      {/* El radar late; parado es un círculo suelto en medio del plano, así que con
          movimiento reducido no se pinta. El alfiler sí se queda: marca el sitio. */}
      {reducido ? null : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `1px solid ${accent}`,
            opacity: 0.5,
            animation: 'theme-radarPulse 2s ease-out infinite',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          fontFamily: 'var(--font-cinzel)',
          fontWeight: 600,
          fontSize: 9,
          letterSpacing: labelLetterSpacing,
          textTransform: 'uppercase',
          color: labelColor ?? accent,
        }}
      >
        ● {label}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          right: 12,
          fontFamily: 'var(--font-cormorant)',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: coordsColor ?? accent,
          opacity: coordsColor === undefined ? 0.7 : 1,
        }}
      >
        {coords}
      </div>
    </div>
  )
}
