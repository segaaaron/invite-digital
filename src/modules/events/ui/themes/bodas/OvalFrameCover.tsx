'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bgAsset: string
  /** Los anillos, debajo de los nombres. */
  readonly ringsAsset: string
  readonly accent: string
  readonly bg: string
  /** El oro pálido de las iniciales. */
  readonly initialsColor: string
  readonly textColor: string
  /** «Nuestra Boda», del contenido del diseño. */
  readonly eyebrow: string
  readonly names: string
  readonly initials: string
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Editorial»: la fotografía de hojas con su óvalo dorado, y dentro el
 * rótulo, las iniciales, los nombres y los anillos.
 *
 * **El óvalo lo trae la fotografía**, no se dibuja. Se dibujaba, y salían dos: el de la
 * imagen y un `border-radius: 50%` encima, desalineados entre sí. Por eso el contenido va
 * en una caja al 22 % y al 14 %, que son los márgenes con los que la maqueta lo mete
 * dentro del óvalo que ya está pintado.
 *
 * Tampoco lleva velo oscuro: la fotografía viene con su propio degradado, y el velo que se
 * le ponía apagaba el verde que es la mitad del diseño.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>` como en la maqueta: con un
 * div, quien navega con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function OvalFrameCover({
  bgAsset,
  ringsAsset,
  accent,
  bg,
  initialsColor,
  textColor,
  eyebrow,
  names,
  initials,
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
        overflow: 'hidden',
        background: bg,
        color: textColor,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span
        style={{
          position: 'absolute',
          left: '22%',
          right: '22%',
          top: '14%',
          bottom: '14%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 15,
            letterSpacing: '0.25em',
            color: accent,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
        <span style={{ fontFamily: 'var(--font-italiana)', fontSize: 64, lineHeight: 1, color: initialsColor, marginTop: 6 }}>
          {initials}
        </span>
        <span
          style={{ fontFamily: 'var(--font-great-vibes)', fontSize: 39, color: textColor, lineHeight: 1, marginTop: 6 }}
        >
          {names}
        </span>
        <Image
          alt=""
          aria-hidden
          height={140}
          src={ringsAsset}
          style={{ width: '45%', height: 'auto', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.35))' }}
          width={140}
        />
        <span
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontWeight: 300,
            fontSize: 9,
            letterSpacing: '0.15em',
            color: textColor,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            marginTop: 20,
          }}
        >
          {hint}
        </span>
      </span>
    </button>
  )
}
