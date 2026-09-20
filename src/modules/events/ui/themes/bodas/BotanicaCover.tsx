'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bg: string
  readonly textColor: string
  /** El arte de la portada: el sobre lacrado sobre las rosas. */
  readonly bgAsset: string
  /** «Llegó el gran día» y «Nos casamos», del diccionario. */
  readonly line1: string
  readonly line2: string
  /** Los nombres de la pareja, tal y como los escribe el cliente. */
  readonly names: string
  /** «Toca en cualquier lugar», del diccionario. */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Botánica»: el sobre lacrado sobre las rosas blancas.
 *
 * Es la de su maqueta (`wedding-variants-2.jsx`, `WeddingBotanicalVN`): `IntroCover` de
 * sobre **con fotografía** y `hideText`, es decir, el arte a sangre y encima tres piezas de
 * texto. Nuestro port se había quedado con el sobre **dibujado** del kit, que es el que la
 * maqueta usa cuando no hay fotografía: la invitación se abría igual, pero la portada —lo
 * primero que ve el invitado y lo que la web enseña del modelo— no era la suya.
 *
 * Las alturas son las de la maqueta (26 %, 36 % y 71 %), en porcentaje de la pantalla, para
 * que el sobre de la fotografía y los nombres encima se sigan encontrando en cualquier
 * teléfono.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla.
 */
export function BotanicaCover({ bg, textColor, bgAsset, line1, line2, names, hint, openLabel }: Props) {
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
        background: bg,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />

      <span style={{ position: 'absolute', left: 0, right: 0, top: '26%', padding: '0 24px', textAlign: 'center', color: textColor }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-cormorant)',
            fontSize: 11,
            letterSpacing: '0.32em',
            textShadow: '0 1px 4px rgba(0,0,0,.25)',
          }}
        >
          {line1}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 5,
            fontFamily: 'var(--font-cormorant)',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '0.28em',
            textShadow: '0 1px 4px rgba(0,0,0,.25)',
          }}
        >
          {line2}
        </span>
      </span>

      {/* Los nombres caen sobre el sobre de la fotografía: es donde la maqueta los pone. */}
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '36%',
          padding: '0 24px',
          textAlign: 'center',
          fontFamily: 'var(--font-great-vibes)',
          fontSize: 26,
          lineHeight: 1.2,
          color: textColor,
          textShadow: '0 1px 6px rgba(0,0,0,.25)',
          whiteSpace: 'pre-line',
        }}
      >
        {names}
      </span>

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '71%',
          textAlign: 'center',
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 10,
          letterSpacing: '0.3em',
          color: textColor,
          opacity: 0.75,
          textShadow: '0 1px 2px rgba(255,255,255,.5)',
        }}
      >
        {hint}
      </span>
    </button>
  )
}
