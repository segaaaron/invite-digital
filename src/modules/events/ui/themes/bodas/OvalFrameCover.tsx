'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bgAsset: string
  /** Los anillos que presiden el óvalo. */
  readonly ringsAsset: string
  readonly accent: string
  readonly bg: string
  readonly textColor: string
  readonly names: string
  readonly initials: string
  /** «Issue · 09 / 2026», del contenido del diseño. */
  readonly label: string
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Editorial»: fotografía de hojas, un óvalo dorado con los anillos dentro y
 * los nombres debajo.
 *
 * Vive con su tema y no en el kit, como las de los XV: el óvalo, los anillos y el verde
 * son de este diseño, y el kit lo comparten los dieciséis.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>` como en la maqueta: con un
 * div, quien navega con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function OvalFrameCover({
  bgAsset,
  ringsAsset,
  accent,
  bg,
  textColor,
  names,
  initials,
  label,
  hint,
  openLabel,
}: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

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
        background: bg,
        color: textColor,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <span aria-hidden style={{ position: 'absolute', inset: 0 }}>
        <Image alt="" fill sizes="480px" src={bgAsset} style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
        <span style={{ position: 'absolute', inset: 0, background: 'rgba(10,25,15,0.45)' }} />
      </span>

      <span
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 18,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 210,
            height: 280,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,25,15,0.25)',
          }}
        >
          <Image alt="" height={120} src={ringsAsset} style={{ width: 120, height: 'auto' }} width={120} />
        </span>

        <span style={{ fontSize: 34, fontStyle: 'italic', fontWeight: 200 }}>{names}</span>
        <span aria-hidden style={{ fontSize: 12, letterSpacing: '0.5em', color: accent }}>
          {initials}
        </span>
        <span style={{ fontSize: 10, letterSpacing: '0.35em' }}>{label}</span>
        <span style={{ fontSize: 9, letterSpacing: '0.3em', opacity: 0.7 }}>{hint}</span>
      </span>
    </button>
  )
}
