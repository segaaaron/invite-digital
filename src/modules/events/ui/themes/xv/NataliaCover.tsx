'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { PALETA as P } from './xv-natalia.palette'

type Props = {
  readonly bgAsset: string
  readonly noteAsset: string
  /** «Te invito a / celebrar mi fiesta», que aquí van en dos renglones de la misma línea. */
  readonly line1: string
  readonly line2: string
  readonly title: string
  readonly name: string
  /** «MIS QUINCE · NATALIA», sin el triángulo: aquí no hay chapa con borde. */
  readonly badge: string
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Encanto Marino»: la invitación fotografiada sobre una partitura.
 *
 * El texto va dentro del recuadro claro que la fotografía ya trae —de ahí los porcentajes
 * del posicionamiento, que son los de la maqueta—: escribir encima de la partitura, fuera
 * de ese recuadro, deja el nombre ilegible.
 */
export function NataliaCover({ bgAsset, noteAsset, line1, line2, title, name, badge, hint, openLabel }: Props) {
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
        background: P.vidrio,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="100vw" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span style={{ position: 'absolute', left: '30%', right: '26%', top: '27%', bottom: '20%' }}>
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontWeight: 300,
              fontSize: 9,
              letterSpacing: '0.22em',
              color: '#6B4A2A',
              textTransform: 'uppercase',
              lineHeight: 1.5,
            }}
          >
            {line1}
            <br />
            {line2}
          </span>
          <Image
            alt=""
            aria-hidden
            height={120}
            src={noteAsset}
            style={{ width: '75%', height: 'auto', marginTop: 10 }}
            width={160}
          />
          <span
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontWeight: 700,
              fontSize: 19.5,
              letterSpacing: '0.1em',
              marginTop: 10,
              color: '#B8901F',
            }}
          >
            {title}
          </span>
          <span style={{ fontFamily: 'var(--font-alex-brush)', fontSize: 38, color: '#2A1D10', lineHeight: 1, marginTop: 4 }}>
            {name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 7,
              letterSpacing: '0.18em',
              color: '#6B4A2A',
              fontWeight: 600,
              marginTop: 14,
            }}
          >
            {badge}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 7,
              letterSpacing: '0.15em',
              color: '#6B4A2A',
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            {hint}
          </span>
        </span>
      </span>
    </button>
  )
}
