'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { PALETA as P } from './boda-sello.palette'

type Props = {
  readonly bgAsset: string
  /** «NOS CASAMOS», el rótulo de arriba. */
  readonly eyebrow: string
  /** Los nombres de la pareja, en una línea. */
  readonly names: string
  /** «TOCA PARA ABRIR», del diccionario. */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Sobre Lacrado»: el sobre con su lacre de oro sobre la acuarela de flores.
 *
 * Es la de su maqueta (`boda-sobre-lacrado.jsx`): la fotografía a sangre y encima tres
 * piezas —el rótulo con su filete de rombo al 24 % de alto, los nombres en caligrafía al
 * 35 % y la llamada a abrir al 70 %, en la mitad izquierda, que es donde el arte deja sitio—.
 * Las alturas van en porcentaje para que caigan sobre el sobre en cualquier teléfono.
 */
export function SelloCover({ bgAsset, eyebrow, names, hint, openLabel }: Props) {
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
        background: P.crema,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span style={{ position: 'absolute', top: '24%', left: 0, right: 0, textAlign: 'center' }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.4em',
            color: P.vino,
          }}
        >
          {eyebrow}
        </span>
        <span aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 }}>
          <span style={{ display: 'block', width: 56, height: 1, background: P.vino, opacity: 0.6 }} />
          <span style={{ display: 'block', width: 7, height: 7, background: P.vino, opacity: 0.85, transform: 'rotate(45deg)' }} />
          <span style={{ display: 'block', width: 56, height: 1, background: P.vino, opacity: 0.6 }} />
        </span>
      </span>

      <span
        style={{
          position: 'absolute',
          top: '35%',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-great-vibes)',
          fontSize: 34,
          lineHeight: 1.1,
          color: P.vino,
        }}
      >
        {names}
      </span>

      <span
        style={{
          position: 'absolute',
          top: '70%',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'var(--font-cormorant)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.4em',
          color: P.vino,
          opacity: 0.75,
        }}
      >
        {hint}
      </span>
    </button>
  )
}
