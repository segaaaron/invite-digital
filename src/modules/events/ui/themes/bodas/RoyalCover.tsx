'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { PALETA as P } from './boda-royal.palette'

type Props = {
  readonly bgAsset: string
  /** Los aros de oro que van bajo la fecha. */
  readonly ringsAsset: string
  readonly eyebrow: string
  readonly names: string
  readonly fecha: string
  readonly cta: string
  readonly openLabel: string
}

/**
 * La portada de «Royal Blush»: el palacio en rosa con el texto centrado y los aros debajo.
 *
 * Es su `IntroCover style="ovalFrame"` con `textCentered`, `ringsBelow` y `ctaBottom: 78`:
 * la fotografía a sangre, el rótulo de la revista, los nombres en Playfair cursiva con su
 * resplandor dorado, el filete de rombo, la fecha, los aros al 26 % del ancho y, abajo, la
 * llamada a entrar con su flecha.
 */
export function RoyalCover({ bgAsset, ringsAsset, eyebrow, names, fecha, cta, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

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
        background: P.rosa,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '30%',
          height: '58%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: P.oroClaro,
            textShadow: '0 1px 3px rgba(245,182,193,0.45)',
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-playfair-display)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 32,
            lineHeight: 1.1,
            maxWidth: '82%',
            color: '#c4788a',
            textShadow: '0 0 10px rgba(212,175,55,0.5), 1px 1px 2px rgba(139,34,82,0.3)',
          }}
        >
          {names}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 90, margin: '6px 0' }}>
          <span style={{ display: 'block', flex: 1, height: 1, background: P.oroClaro }} />
          <span style={{ display: 'block', width: 6, height: 6, background: P.oroClaro, transform: 'rotate(45deg)' }} />
          <span style={{ display: 'block', flex: 1, height: 1, background: P.oroClaro }} />
        </span>
        {fecha === '' ? null : (
          <span
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontWeight: 300,
              fontSize: 12.5,
              letterSpacing: '0.25em',
              color: P.oroClaro,
              textShadow: '0 1px 3px rgba(245,182,193,0.45)',
            }}
          >
            {fecha}
          </span>
        )}
        <span style={{ display: 'block', width: '26%', marginTop: 10 }}>
          <Image alt="" aria-hidden height={120} sizes="120px" src={ringsAsset} style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.25))' }} width={120} />
        </span>
      </span>

      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 78, textAlign: 'center', color: '#722f37' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-cormorant)', fontWeight: 500, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {cta}
        </span>
        <span
          aria-hidden
          style={{ display: 'block', marginTop: 10, fontSize: 18, animation: reducido ? undefined : 'theme-bounceDown 1.4s ease-in-out infinite' }}
        >
          ↓
        </span>
      </span>
    </button>
  )
}
