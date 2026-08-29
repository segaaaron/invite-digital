'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bgAsset: string
  /** El oro viejo con el que la maqueta escribe sobre la acuarela. */
  readonly accent: string
  /** «15 AÑOS», la copia del propio diseño. */
  readonly title: string
  readonly name: string
  /** «▸ MIS XV AÑOS · ISABELLE», la chapa con borde. */
  readonly badge: string
  /** «INGRESA A MI INVITACIÓN», abajo del todo. */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de una sola fotografía: la imagen a sangre y el rótulo sobre ella.
 *
 * Es la del palacio griego, donde la portada **es** la ilustración. El texto no va abajo
 * sino a dos tercios de la altura, que es donde la acuarela deja sitio claro; de ahí el
 * `top: 56%` con el bloque colgado hacia arriba, que son los de la maqueta. Y va sin velo
 * oscuro, con sombra blanca en la letra: un velo sobre una acuarela clara la ensucia
 * entera.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function ImageOnlyCover({ bgAsset, accent, title, name, badge, hint, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  const sombra = '0 1px 4px rgba(255,255,255,.95)'

  return (
    <button
      aria-label={openLabel}
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
        color: accent,
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
          top: '56%',
          transform: 'translateY(-100%)',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-italiana)',
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: accent,
            textShadow: sombra,
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-great-vibes)',
            fontSize: 54,
            marginTop: 8,
            color: accent,
            textShadow: sombra,
          }}
        >
          {name}
        </span>
        <span
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '8px 16px',
            border: `1.5px solid ${accent}`,
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 10,
            letterSpacing: '0.25em',
            color: accent,
            textShadow: sombra,
          }}
        >
          {badge}
        </span>
      </span>

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '95%',
          textAlign: 'center',
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 11,
          letterSpacing: '0.4em',
          color: accent,
          textShadow: sombra,
        }}
      >
        {hint}
      </span>
    </button>
  )
}
